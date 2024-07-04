/* global ll mc JsonConfigFile Format PermType logger file */
// LiteLoaderScript Dev Helper
/// <reference path="../HelperLib/src/index.d.ts"/>

const pluginName = 'EveryoneWarp';
const confDir = `plugins/${pluginName}`;
const confPath = `${confDir}/warps.json`;
const warpConf = new JsonConfigFile(confPath);

const newNavigationTask = ll.imports('NavAPI_newTask');
const clearNavigationTask = ll.imports('NavAPI_clearTask');
const hasNavigationTask = ll.imports('NavAPI_hasTask');

const {
  Red,
  DarkGreen,
  Green,
  Aqua,
  White,
  LightPurple,
  Bold,
  Clear,
  MinecoinGold,
} = Format;

/**
 * @typedef {Object} FloatPosObject
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} dimId
 */
/**
 * @typedef {Object} WarpPlayerData
 * @property {string} name
 * @property {string} realName
 * @property {string} xuid
 */
/**
 * @typedef {Object} WarpData
 * @property {WarpPlayerData} player
 * @property {FloatPosObject} pos
 * @property {string} name
 * @property {string} date
 * @property {string?} desc
 */

/**
 * @returns {WarpData[]}
 */
function getWarpConf() {
  return warpConf.get('warps', []);
}

/**
 * @param {WarpData[]} conf
 * @returns {boolean}
 */
function setWarpConf(conf) {
  return warpConf.set('warps', conf);
}

/**
 * @param {FloatPosObject} pos
 * @returns {string}
 */
function formatPos(pos) {
  const { x, y, z, dimId } = pos;
  const dim = (() => {
    switch (dimId) {
      case 0:
        return 'overworld';
      case 1:
        return 'nether';
      case 2:
        return 'end';
      default:
        return 'unknown';
    }
  })();
  return (
    `${Green}${x.toFixed(2)} ` +
    `${Red}${y.toFixed(2)} ` +
    `${Aqua}${z.toFixed(2)}` +
    `${White}， ${LightPurple}${dim}`
  );
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const yr = date.getFullYear();
  const mon = date.getMonth() + 1;
  const day = date.getDate();
  const hr = date.getHours();
  const min = date.getMinutes().toString().padStart(2, '0');
  const sec = date.getSeconds().toString().padStart(2, '0');
  return `${yr}-${mon}-${day} ${hr}:${min}:${sec}`;
}

/**
 * @param {LLSE_Player} pl
 * @param {FloatPosObject} pos
 * @param {string} warpName
 * @param {string?} desc
 * @returns {WarpData}
 */
function getWarpObj(pl, pos, warpName, desc = null) {
  const { name, realName, xuid } = pl;
  return {
    player: { name, realName, xuid },
    pos,
    name: warpName,
    date: new Date().toJSON(),
    desc,
  };
}

/**
 * @param {LLSE_SimpleForm} form
 * @param {WarpData[]} warps
 * @returns {LLSE_SimpleForm}
 */
function addWarpButton(form, warps) {
  let formTmp = form;
  warps.forEach((i) => {
    const {
      player: { name: playerName },
      pos,
      name,
    } = i;
    formTmp = form.addButton(
      `${Bold}${DarkGreen}${name}${Clear}\n` +
        `${formatPos(pos)}${Clear} - ${MinecoinGold}${playerName}`
    );
  });
  return formTmp;
}

/**
 * @param {LLSE_Player} pl_
 */
function addWarp(pl_) {
  const {
    pos: { x: x_, y: y_, z: z_, dimid: dimId_ },
  } = pl_;
  const strX = x_.toFixed(2).toString();
  const strY = y_.toFixed(2).toString();
  const strZ = z_.toFixed(2).toString();
  const form = mc
    .newCustomForm()
    .setTitle('添加Warp')
    .addInput('Warp名称', '', `${pl_.name} 创建的Warp`)
    .addInput('X坐标', strX, strX)
    .addInput('Y坐标', strY, strY)
    .addInput('Z坐标', strZ, strZ)
    .addDropdown('Dimensions', ['Overworld', 'nether', 'end'], dimId_)
    .addInput('Warp简介');
  pl_.sendForm(form, (pl, data) => {
    if (data) {
      const [name, x, y, z, dimId, desc] = data;

      if (!name) {
        pl.tell(`${Red}Please enter legal content`);
        return;
      }

      const pos = {
        x: x ? Number(x) : x_,
        y: y ? Number(y) : y_,
        z: z ? Number(z) : z_,
        dimId,
      };
      const obj = getWarpObj(pl, pos, name, desc);

      const warps = getWarpConf();
      warps.push(obj);
      setWarpConf(warps);

      pl.tell(
        `${Green}create Warp ${MinecoinGold}${name} ${Green}success！\n` +
          `coordinate：${formatPos(pos)}`
      );
    } else {
      pl.tell(`${Red}Operation canceled`);
    }
  });
}

/**
 * @param {LLSE_Player} pl
 * @param {string} tip
 * @param {() => any} callback
 */
function confirmBox(pl, tip, callback) {
  pl.sendModalForm(
    '确认',
    tip,
    `${Green}I've thought about it`,
    `${Red}My hand slipped`,
    (_, res) => {
      if (res) {
        callback();
      } else {
        pl.tell(`${Red}Operation canceled`);
      }
    }
  );
}

/**
 * @param {any} obj1
 * @param {any} obj2
 * @returns {boolean}
 */
function compareObject(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * @param {LLSE_Player} pl
 * @param {WarpData} warpObj
 */
function deleteWarp(pl, warpObj) {
  const { name, pos } = warpObj;
  confirmBox(
    pl,
    `really want to delete Warp ${Bold}${MinecoinGold}${name}${Clear}` +
      `(${formatPos(pos)}${Clear}) ？`,
    () => {
      const conf = getWarpConf();
      const index = conf.findIndex((x) => compareObject(x, warpObj));
      if (index === -1) {
        pl.tell(`${Red}Warp does not exist！`);
        return;
      }
      conf.splice(index, 1);
      setWarpConf(conf);

      pl.tell(
        `${Green}warp deleted ${MinecoinGold}${name}\n` +
          `${Green}coordinate： ${formatPos(pos)}`
      );
    }
  );
}

/**
 * @param {LLSE_Player} pl_
 */
function deleteWarpForm(pl_) {
  const form = mc
    .newSimpleForm()
    .setTitle('delete delete')
    .setContent('Please select what you want to delete');
  /** @type {WarpData[]} */
  const playerWarps = [];
  getWarpConf().forEach((it) => {
    if (it.player.xuid === pl_.xuid || pl_.permLevel > 0) {
      playerWarps.push(it);
    }
  });
  pl_.sendForm(addWarpButton(form, playerWarps), (pl, id) => {
    if (id !== undefined && id !== null) {
      const warp = playerWarps[id];
      deleteWarp(pl, warp);
    }
  });
}

/**
 * @param {LLSE_Player} pl
 */
function warpList(pl) {
  /**
   * @param {LLSE_Player} pl_
   * @param {WarpData} warp
   */
  function warpDetail(pl_, warp) {
    const {
      player: { name: playerName, xuid },
      pos,
      name,
      date,
      desc,
    } = warp;

    const isOwner = pl_.xuid === xuid || pl.permLevel > 0;

    let form = mc
      .newSimpleForm()
      .setTitle('Warp详情')
      .setContent(
        `- ${DarkGreen}name： ${Bold}${Green}${name}${Clear}\n` +
          `- ${DarkGreen}creator： ` +
          `${Bold}${Green}${playerName}${Clear}${Green}（${xuid}）${Clear}\n` +
          `- ${DarkGreen}coordinate： ${Bold}${formatPos(pos)}${Clear}\n` +
          `- ${DarkGreen}Creation date： ` +
          `${Bold}${Green}${formatDate(new Date(date))}${Clear}\n` +
          `- ${DarkGreen}Introduction： ${Bold}${Green}${desc || 'none'}`
      )
      .addButton(`${DarkGreen}navigation`);

    if (isOwner) form = form.addButton(`${DarkGreen}delete`);
    form = form.addButton(`${DarkGreen}Return to Warp list`);

    pl_.sendForm(form, (pl__, id) => {
      if (id !== undefined && id !== null) {
        switch (id) {
          case 0: {
            const { xuid: xuidP } = pl__;
            if (hasNavigationTask(xuidP)) clearNavigationTask(xuidP);
            newNavigationTask(xuidP, warp);
            break;
          }
          case 1:
            if (isOwner) {
              deleteWarp(pl, warp);
              break;
            }
          // fallthrough
          case 2:
            warpList(pl__);
            break;
          default:
        }
      }
    });
  }

  const warps = getWarpConf();
  const form = mc
    .newSimpleForm()
    .setTitle(pluginName)
    .setContent(`Currently there are ${Green}${warps.length}${Clear} Warp`);
  pl.sendForm(addWarpButton(form, warps), (p, i) => {
    if (i !== undefined && i !== null) {
      warpDetail(p, warps[i]);
    }
  });
}

/**
 * @param {LLSE_Player} pl_
 */
function warpManage(pl_) {
  pl_.sendForm(
    mc
      .newSimpleForm()
      .setTitle('Warp management')
      .addButton('Add Warp')
      .addButton('Delete Warp')
      .addButton('Cancel navigation'),
    (pl, id) => {
      if (id !== undefined && id !== null) {
        switch (id) {
          case 0:
            addWarp(pl);
            break;
          case 1:
            deleteWarpForm(pl);
            break;
          case 2:
            clearNavigationTask(pl.xuid);
            break;
          default:
        }
      }
    }
  );
}

mc.listen('onServerStarted', () => {
  (() => {
    const cmd = mc.newCommand('warpmanage', 'Manage Warps', PermType.Any);
    cmd.setAlias('warpm');

    cmd.setCallback((_, origin, out) => {
      if (!origin.player) {
        out.error('This command can only be executed by the player');
        return false;
      }
      warpManage(origin.player);
      return true;
    });

    cmd.overload();
    cmd.setup();
  })();

  (() => {
    const cmd = mc.newCommand('warplist', 'View Warp', PermType.Any);
    cmd.setAlias('warp');

    cmd.setCallback((_, origin, out) => {
      if (!origin.player) {
        out.error('This command can only be executed by the player');
        return false;
      }
      warpList(origin.player);
      return true;
    });

    cmd.overload();
    cmd.setup();
  })();
});

(() => {
  const oldConfDir = `plugins/EveryoneWrap`;
  const oldConfPath = `${oldConfDir}/warps.json`;

  if (file.exists(oldConfPath)) {
    setWarpConf(new JsonConfigFile(oldConfPath).get('wraps'));
    file.rename(oldConfPath, `${confDir}/warps_old.json`);
    logger.info('Old plug-in data migration completed');
  }
})();

ll.registerPlugin(pluginName, 'public coordinate point', [0, 2, 2], {
  Author: 'student_2333',
  License: 'Apache-2.0',
});
