# 情绪药店 · Android 外壳

这是一个不依赖 Gradle / Android Studio 的极简 WebView 外壳：把整个纯前端游戏放进 `assets/www`，用系统 WebView 打开。

**成品 APK：**

- `android/build/EmotionPharmacy-v2.apk`
- `emotion-pharmacy/EmotionPharmacy-v2.apk`
- `D:\myob\emo\EmotionPharmacy-v2.apk`

- 包名：`com.emotionpharmacy.game`
- 版本：`2.0`（versionCode `2`）
- 最低系统：Android 7.0（API 24）
- 目标系统：Android 14（API 34）
- 签名：项目内自签名 release 包（v2 + v3），可直接侧载
- 体积：约 176 KB

## 安装

把 APK 传到手机，点开安装；Android 会要求允许“安装未知来源应用”。没有额外权限弹窗，也没有广告或联网内容。

APK 是独立安装：浏览器里已有的 `localStorage` 进度不会自动迁移到 APK，APK 内的存档会从新安装开始。之后再覆盖安装同一签名的新 APK，进度会保留。

## 构建

需要：

- Android SDK：build-tools（含 `aapt2`、`d8`、`zipalign`、`apksigner`）和至少一个 platform（`android.jar`）
- JDK 17 或 21
- Python 3 + Pillow（生成图标和重打包；如果系统没有 Python，脚本会尝试 DSH 自带的 Python）

在项目根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File android/build-apk.ps1
```

脚本会自动：

1. 从 `emotion-pharmacy` 复制 `index.html`、`css/`、`js/`、`data/`、`assets/characters/*.svg` 到 `android/app/src/main/assets/www`。
2. 用 `make-icons.py` 生成孟菲斯风格启动图标（含 Android 8+ 自适应图标）。
3. 用 `aapt2` 编译资源、链接出资源 APK；用 `javac` + `d8` 编译 `MainActivity` 并生成 `classes.dex`。
4. 用 `repack.py` 把资源、WebView 资源和 `classes.dex` 重新打包成干净 APK（避免 Windows 路径导致的 zip header mismatch）。
5. `zipalign`，用项目内的 `keystore/emotion-pharmacy.jks` 签名，并校验签名与对齐。
6. 把成品复制回游戏目录和上级目录。

SDK 路径会依次查找 `ANDROID_HOME`、`ANDROID_SDK_ROOT`、`D:\Android\Sdk`、`%LOCALAPPDATA%\Android\Sdk`。JDK 优先使用 `JAVA_HOME`。

## 签名

- Keystore：`android/keystore/emotion-pharmacy.jks`（本地文件，已加入 `.gitignore`，**不随仓库上传**）
- Alias 和默认密码见 `build-apk.ps1`；首次构建时如果没有 keystore 会自动生成。

这是给个人侧载用的自签名 key。**以后如果要覆盖安装升级，必须继续用同一个 keystore**；否则 Android 会因签名不同而拒绝安装。仓库里的 APK 是用本机 key 签的；如果在一台没有这个 keystore 的机器上重新构建，脚本会生成新 key，新 APK 需要先卸载旧 APK 才能安装。

## 游戏是怎么加载的

`MainActivity` 没有用 `file:///android_asset/...`，而是：

- 用 `https://appassets.local/index.html` 作为入口；
- 在 `WebViewClient.shouldInterceptRequest` 中把 `appassets.local` 的请求映射到 APK 的 `assets/www/...`；
- 返回正确的 MIME（HTML / CSS / JS / SVG / PNG 等）。

这样 WebView 会把它当成一个正常的 https 安全源，`localStorage` 可以持久保存游戏进度，同时不会真的发出网络请求。Manifest 里的 `INTERNET` 权限只是为个别 WebView 实现的兼容留口，游戏没有外部接口、广告或统计。

其他细节：

- 关闭文件访问和内容访问；
- 强制浅色模式，状态栏 / 导航栏使用奶油色；
- 关闭缩放、长按选择和溢出滚动；
- 旋转屏幕不重建 Activity，WebView 直接重排；
- 返回键退出应用（游戏是单页，没有可回退的浏览历史）。

## 目录

```text
android/
├── app/src/main/
│   ├── AndroidManifest.xml
│   ├── java/com/emotionpharmacy/game/MainActivity.java
│   ├── res/                      图标、颜色、主题
│   └── assets/www/               构建时从游戏复制，可随时重建
├── keystore/emotion-pharmacy.jks  本地签名 key（不提交）
├── make-icons.py
├── repack.py
├── build-apk.ps1
└── build/                        构建产物（含最终 APK）
```

`app/src/main/assets/www` 是构建产物，不需要手工维护；改完游戏后重新运行脚本即可。

## 更新游戏后重新打包

1. 正常修改 `emotion-pharmacy` 里的网页源码。
2. 重新运行 `android/build-apk.ps1`。
3. 新的 APK 会覆盖 `emotion-pharmacy/EmotionPharmacy-v2.apk` 和上级目录的同名文件。

如果只是改网页，不需要动 `MainActivity.java`；如果改包名、应用名、图标或启动行为，再改 `AndroidManifest.xml` / `res` / `MainActivity.java`。
