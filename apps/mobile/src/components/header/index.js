import React, {createRef} from 'react';
import {Platform, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {DDS} from '../../../App';
import {SIZE, WEIGHT} from '../../common/common';
import {useTracked} from '../../provider';
import {eSendEvent} from '../../services/eventManager';
import {eCloseLoginDialog} from '../../services/events';
import NavigationService from '../../services/NavigationService';
import {SideMenuEvent} from '../../utils/utils';
import {moveNoteHideEvent} from '../DialogManager';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Menu, {MenuItem, MenuDivider} from 'react-native-material-menu';
import {ACTIONS} from '../../provider/actions';
export const Header = ({
  heading,
  canGoBack = true,
  hide,
  showSearch,
  menu,
  verticalMenu = false,
  preventDefaultMargins,
  navigation = null,
  isLoginNavigator,
  headerColor,
}) => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const menuRef = createRef();
  return (
    <View
      style={{
        flexDirection: 'row',
        zIndex: 10,
        height: 50,
        marginTop:
          Platform.OS === 'ios'
            ? 0
            : preventDefaultMargins || isLoginNavigator
            ? 0
            : StatusBar.currentHeight,
        marginBottom: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        width: '100%',
      }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}>
        {canGoBack ? (
          <TouchableOpacity
            hitSlop={{top: 20, bottom: 20, left: 50, right: 40}}
            onPress={() => {
              if (navigation && preventDefaultMargins) {
                if (navigation.state.routeName === 'Folders') {
                  moveNoteHideEvent();
                } else {
                  navigation.goBack();
                }
              } else if (navigation && isLoginNavigator) {
                if (navigation.state.routeName === 'Login') {
                  eSendEvent(eCloseLoginDialog);
                } else {
                  navigation.goBack();
                }
              } else {
                NavigationService.goBack();
              }
            }}
            style={{
              justifyContent: 'center',
              alignItems: 'flex-start',
              height: 40,
              width: 50,
            }}>
            <Icon
              style={{
                marginLeft: -5,
              }}
              color={colors.pri}
              name={'chevron-left'}
              size={SIZE.xxxl - 3}
            />
          </TouchableOpacity>
        ) : (
          undefined
        )}
        {menu && !DDS.isTab ? (
          <TouchableOpacity
            hitSlop={{top: 20, bottom: 20, left: 50, right: 40}}
            onPress={() => {
              SideMenuEvent.open();
            }}
            style={{
              justifyContent: 'center',
              alignItems: 'flex-start',
              height: 40,
              width: 60,
            }}>
            <Icon color={colors.pri} name={'menu'} size={SIZE.xxxl} />
          </TouchableOpacity>
        ) : (
          undefined
        )}

        <Text
          style={{
            fontSize: SIZE.xl,
            color: headerColor ? headerColor : colors.pri,
            fontFamily: WEIGHT.bold,
          }}>
          <Text
            style={{
              color: colors.accent,
            }}>
            {heading.slice(0, 1) === '#' ? '#' : null}
          </Text>

          {heading.slice(0, 1) === '#' ? heading.slice(1) : heading}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <Animatable.View
          transition="opacity"
          useNativeDriver={true}
          duration={500}
          style={{
            opacity: hide ? 1 : 0,
          }}>
          <TouchableOpacity
            onPress={() => showSearch()}
            style={{
              justifyContent: 'center',
              alignItems: 'flex-end',
              height: 40,
              width: 60,
              paddingRight: 0,
            }}>
            <Icon name={'magnify'} size={SIZE.xl} color={colors.icon} />
          </TouchableOpacity>
        </Animatable.View>
        {verticalMenu ? (
          <Menu
            ref={menuRef}
            style={{
              borderRadius: 5,
            }}
            button={
              <TouchableOpacity
                onPress={() => {
                  menuRef.current?.show();
                }}
                style={{
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  height: 40,
                  width: 60,
                }}>
                <Icon name="sort" size={SIZE.xl} color={colors.icon} />
              </TouchableOpacity>
            }>
            <MenuItem
              textStyle={{
                color: colors.icon,
                fontSize: 12,
              }}>
              Sort by:
            </MenuItem>
            <MenuDivider />
            <MenuItem
              onPress={() => {
                dispatch({type: ACTIONS.NOTES, sort: null});
                menuRef.current?.hide();
              }}>
              Default
            </MenuItem>
            <MenuItem
              onPress={() => {
                dispatch({type: ACTIONS.NOTES, sort: 'abc'});
                menuRef.current?.hide();
              }}>
              Alphabetical
            </MenuItem>
            <MenuItem
              onPress={() => {
                dispatch({type: ACTIONS.NOTES, sort: 'year'});
                menuRef.current?.hide();
              }}>
              By year
            </MenuItem>
            <MenuItem
              onPress={() => {
                dispatch({type: ACTIONS.NOTES, sort: 'month'});
                menuRef.current?.hide();
              }}>
              By month
            </MenuItem>
            <MenuItem
              onPress={() => {
                dispatch({type: ACTIONS.NOTES, sort: 'week'});
                menuRef.current?.hide();
              }}>
              By week
            </MenuItem>
          </Menu>
        ) : null}
      </View>
    </View>
  );
};
