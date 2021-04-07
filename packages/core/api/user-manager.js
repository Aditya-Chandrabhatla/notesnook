import http from "../utils/http";
import constants from "../utils/constants";
import TokenManager from "./token-manager";
import { EV, EVENTS } from "../common";

const ENDPOINTS = {
  signup: "/users",
  token: "/connect/token",
  user: "/users",
  deleteUser: "/users/delete",
  patchUser: "/account",
  verifyUser: "/account/verify",
  revoke: "/connect/revocation",
  recoverAccount: "/account/recover",
  migrateStatus: "/migrate/status",
  hcliMigrate: "/migrate/hcli",
};

class UserManager {
  /**
   *
   * @param {import("./index").default} db
   */
  constructor(db) {
    this._db = db;
    this.tokenManager = new TokenManager(db);
  }

  async init() {
    const user = await this.getUser();
    if (!user) return;
    if (!user.remember) await this.logout(true, "Session expired.");
  }

  async signup(email, password) {
    const hashedPassword = await this._db.context.hash(password, email);
    await http.post(`${constants.API_HOST}${ENDPOINTS.signup}`, {
      email,
      password: hashedPassword,
      client_id: "notesnook",
    });
    EV.publish(EVENTS.userSignedUp);
    return await this.login(email, password, true, hashedPassword);
  }

  async _getUserStatus(email) {
    return await http.post(`${constants.AUTH_HOST}${ENDPOINTS.migrateStatus}`, {
      email,
    });
  }

  async _hcliMigrate(email, plaintextPassword, hashedPassword) {
    return await http.post(`${constants.AUTH_HOST}${ENDPOINTS.hcliMigrate}`, {
      username: email,
      plaintext_password: plaintextPassword,
      hashed_password: hashedPassword,
    });
  }

  async _migrateUser(email, plaintextPassword) {
    const status = await this._getUserStatus(email);
    var hashedPassword = await this._db.context.hash(plaintextPassword, email);
    if (!status.hcli) {
      await this._hcliMigrate(email, plaintextPassword, hashedPassword);
    }
    return hashedPassword;
  }

  async login(email, password, remember, hashedPassword) {
    if (!hashedPassword) {
      hashedPassword = await this._migrateUser(email, password);
    }

    await this.tokenManager.saveToken(
      await http.post(`${constants.AUTH_HOST}${ENDPOINTS.token}`, {
        username: email,
        password: hashedPassword,
        grant_type: "password",
        scope: "notesnook.sync offline_access openid IdentityServerApi",
        client_id: "notesnook",
      })
    );

    const user = await this.fetchUser(remember);
    await this._db.context.deriveCryptoKey(`_uk_@${user.email}`, {
      password,
      salt: user.salt,
    });

    EV.publish(EVENTS.userLoggedIn, user);
  }

  async getSessions() {
    const token = await this.tokenManager.getAccessToken();
    if (!token) return;
    await http.get(`${constants.AUTH_HOST}/account/sessions`, token);
  }

  async logout(revoke = true, reason) {
    try {
      if (revoke) await this.tokenManager.revokeToken();
    } catch (e) {
      console.error(e);
    } finally {
      this.tokenManager.clearToken();
      await this._db.context.clear();
      EV.publish(EVENTS.userLoggedOut, reason);
    }
  }

  setUser(user) {
    if (!user) return;
    return this._db.context.write("user", user);
  }

  getUser() {
    return this._db.context.read("user");
  }

  async deleteUser(password) {
    let token = await this.tokenManager.getAccessToken();
    if (!token) return;
    const user = await this.getUser();
    await http.post(
      `${constants.API_HOST}${ENDPOINTS.deleteUser}`,
      { password: await this._db.context.hash(password, user.email) },
      token
    );
    await this.logout(false, "Account deleted.");
    return true;
  }

  async fetchUser(remember = false) {
    try {
      let token = await this.tokenManager.getAccessToken();
      if (!token) return;
      const user = await http.get(
        `${constants.API_HOST}${ENDPOINTS.user}`,
        token
      );
      if (user) {
        const oldUser = await this.getUser();
        if (!!oldUser && !oldUser.isEmailConfirmed && user.isEmailConfirmed) {
          // generate new token
          const token = await this.tokenManager.getToken(false);
          await this.tokenManager._refreshToken(token);
        }

        await this.setUser({ ...user, remember });
        EV.publish(EVENTS.userFetched, user);
        return user;
      } else {
        return await this.getUser();
      }
    } catch (e) {
      if (e.message === "invalid_grant" || e.message === "invalid_client") {
        return await this.logout(false, "Session expired.");
      }
      console.error(e);
      return await this.getUser();
    }
  }

  changePassword(oldPassword, newPassword) {
    return this._updatePassword("change_password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  resetPassword(newPassword) {
    return this._updatePassword("reset_password", {
      new_password: newPassword,
    });
  }

  async getEncryptionKey() {
    const user = await this.getUser();
    if (!user) return;
    const key = await this._db.context.getCryptoKey(`_uk_@${user.email}`);
    return { key, salt: user.salt };
  }

  async sendVerificationEmail() {
    let token = await this.tokenManager.getAccessToken();
    if (!token) return;
    await http.post(
      `${constants.AUTH_HOST}${ENDPOINTS.verifyUser}`,
      null,
      token
    );
  }

  recoverAccount(email) {
    return http.post(`${constants.AUTH_HOST}${ENDPOINTS.recoverAccount}`, {
      email,
      client_id: "notesnook",
    });
  }

  async _updatePassword(type, data) {
    let token = await this.tokenManager.getAccessToken();
    if (!token) return;

    // we hash the passwords beforehand
    const { email, salt } = await this.getUser();
    var hashedData = {};
    if (data.old_password)
      hashedData.old_password = await this._db.context.hash(
        data.old_password,
        email
      );
    if (data.new_password)
      hashedData.new_password = await this._db.context.hash(
        data.new_password,
        email
      );

    await http.patch(
      `${constants.AUTH_HOST}${ENDPOINTS.patchUser}`,
      {
        type,
        ...hashedData,
      },
      token
    );
    await this._db.outbox.add(
      type,
      { newPassword: data.new_password },
      async () => {
        await this._db.sync(true);

        await this._db.context.deriveCryptoKey(`_uk_@${email}`, {
          password: data.new_password,
          salt,
        });

        await this._db.sync(false, true);
      }
    );
    return true;
  }
}

export default UserManager;
