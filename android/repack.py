"""把 aapt2 产出的资源 APK、WebView 资源和 classes.dex 重新打包成干净的 APK。

aapt2 在 Windows 上直接 -A assets 时，zip 局部头里的路径可能使用反斜杠，
导致 zipalign / apksigner 报 header mismatch。这里统一用正斜杠写入。
"""
import os
import sys
import zipfile

res_apk, assets_dir, dex_path, out_apk = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

with zipfile.ZipFile(res_apk, "r") as zin, zipfile.ZipFile(out_apk, "w") as zout:
    for info in zin.infolist():
        data = zin.read(info.filename)
        entry = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        entry.compress_type = info.compress_type
        entry.external_attr = info.external_attr
        entry.internal_attr = info.internal_attr
        entry.create_system = info.create_system
        zout.writestr(entry, data)

    for root, dirs, files in os.walk(assets_dir):
        for name in files:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, assets_dir).replace("\\", "/")
            entry = zipfile.ZipInfo("assets/" + rel, date_time=(2024, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            with open(full, "rb") as fh:
                zout.writestr(entry, fh.read())

    entry = zipfile.ZipInfo("classes.dex", date_time=(2024, 1, 1, 0, 0, 0))
    entry.compress_type = zipfile.ZIP_DEFLATED
    with open(dex_path, "rb") as fh:
        zout.writestr(entry, fh.read())

print("repacked:", out_apk)
