# 角色立绘 · 可替换资源

这里放着六位顾客的立绘，游戏中的顾客舞台、人物小记、信件卡片、信纸抬头、结尾和配药界面都会读取同一张图。

## 文件

| 文件 | 角色 | 主色 / 辅色 |
|---|---|---|
| `linzhi.svg` | 林栀 | 黄 `#feca57` / 青 `#48dbfb` |
| `tangyuan.svg` | 唐沅 | 粉 `#ff9ff3` / 黄 `#feca57` |
| `xutang.svg` | 许棠 | 绿 `#1dd1a1` / 沙金 `#e6b566` |
| `zhouye.svg` | 周野 | 青 `#48dbfb` / 红 `#ff6b6b` |
| `shenhe.svg` | 沈禾 | 红 `#ff6b6b` / 绿 `#1dd1a1` |
| `guhuaian.svg` | 顾怀安 | 橙 `#ff9f43` / 青 `#48dbfb` |

当前文件是 400 × 520 的 SVG，透明背景，画的是半身像：头部在画面上方约 55%，肩部延伸到画布底部。这样放到不同大小的框里都不会裁掉脸。

## 替换成自己的图片

1. 把新图片放进本目录，例如 `linzhi.png`。
2. 打开 `data/characters.js`，把该角色的 `portrait` 改成新路径：
   ```js
   portrait: 'assets/characters/linzhi.png'
   ```
3. 刷新页面即可。**不需要改 JS 逻辑或 CSS。**

推荐规格：

- 透明背景的 PNG / WebP，或同样构图的 SVG；JPG 也可以，但会带着背景方块。
- 建议至少 600 × 780，长宽比接近 3:4 或 2:3。
- 头部尽量在上半部分，底部留出肩部；游戏会在小方框里用 `object-fit: cover` 做头像，在舞台上用 `contain` 显示全身。
- 如果图片加载失败，会自动换成同色系的占位图（角色印记 + 几何图案），不会破版。

## 除了图片，还能改什么

| 想改的东西 | 去哪里改 | 影响 |
|---|---|---|
| 立绘文件 / 路径 | `data/characters.js` 的 `portrait` | 所有出现立绘的地方 |
| 角色主色、辅色 | `data/characters.js` 的 `themeColor` / `secondaryColor` | 舞台圆盘、姓名贴纸、信件卡片、记忆区块、结尾 |
| 信纸底色 | `data/characters.js` 的 `paperColor` | 信纸阅读界面 |
| 信件图案 | `data/characters.js` 的 `pattern` | 信件卡片底部的点 / 斜纹 / 波浪 / 网格 / 棋盘 / 条纹 |
| 信件印章字 | `data/characters.js` 的 `seal` | 信件卡片和信纸上的圆形印章 |
| 药物颜色 | `data/medicines.js` 的 `color` | 药瓶液体、药卡色带、图标颜色 |
| 药物图标 | `js/medicine.js` 的 `GLYPHS` | 药卡上的小图标 |
| 立绘框大小 | `css/customer.css`、`css/medicine.css`、`css/archive.css` 中的 `.portrait-img--*` / `.letter-card__avatar` / `.letter-head__avatar` | 各处的图片尺寸 |
| 占比 / 裁切位置 | 同上，`object-fit` / `object-position` | 头像框的取景 |

立绘只是图片，不需要和角色数据里的其他字段绑定；换图后如果颜色不搭，改 `themeColor` / `secondaryColor` 即可。

## 为什么有占位图

`js/portrait.js` 会给每张图加上 `data-character`，并在 `onerror` 时调用 `EP.portrait.fallback()`。所以即使你只放了五张图、或者路径写错，页面仍然能正常玩，只是对应角色会显示一张带印章的彩色占位图。
