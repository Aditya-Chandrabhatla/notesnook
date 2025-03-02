/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Locator, Page } from "@playwright/test";
import { getTestId } from "../utils";
import { ContextMenuModel } from "./context-menu.model";

export class TabItemModel {
  private readonly closeButton: Locator;
  readonly contextMenu: TabContextMenuModel;
  readonly titleElement: Locator;

  constructor(readonly locator: Locator, page: Page) {
    this.closeButton = locator.locator(getTestId("tab-close-button"));
    this.contextMenu = new TabContextMenuModel(page, locator);
    this.titleElement = locator.locator(getTestId("tab-title"));
  }

  async getId() {
    const testId = await this.locator.getAttribute("data-test-id");
    return testId?.replace("tab-", "");
  }

  async click() {
    return this.locator.click();
  }

  async title() {
    return this.titleElement.textContent();
  }

  async isActive() {
    const classList = await this.locator.getAttribute("class");
    return !!classList?.includes("active");
  }

  close() {
    return this.closeButton.click();
  }
}

class TabContextMenuModel {
  private readonly menu: ContextMenuModel;
  constructor(page: Page, private readonly tabLocator: Locator) {
    this.menu = new ContextMenuModel(page);
  }

  async pin() {
    await this.open();
    await this.menu.clickOnItem("pin");
  }

  async open() {
    await this.menu.open(this.tabLocator);
  }
}
