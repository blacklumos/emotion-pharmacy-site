"""生成情绪药店的安卓启动图标（孟菲斯风格）。
用法：python android/make-icons.py <res-dir>
"""
from PIL import Image, ImageDraw
import os
import sys

RES = sys.argv[1]
S = 1024


def draw(adaptive=False):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not adaptive:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=170, fill="#fef9ef")
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=170, outline="#000000", width=44)
    c = S // 2
    # 背景黄色圆盘
    r = 332 if not adaptive else 300
    d.ellipse([c - r, c - r, c + r, c + r], fill="#feca57", outline="#000000", width=40)
    # 瓶身
    d.rounded_rectangle([c - 128, c - 48, c + 128, c + 286], radius=58, fill="#ff6b6b", outline="#000000", width=30)
    # 瓶颈
    d.rectangle([c - 54, c - 180, c + 54, c - 40], fill="#ff6b6b", outline="#000000", width=30)
    # 瓶塞
    d.rounded_rectangle([c - 72, c - 244, c + 72, c - 172], radius=18, fill="#48dbfb", outline="#000000", width=30)
    # 标签
    d.rounded_rectangle([c - 96, c + 62, c + 96, c + 190], radius=18, fill="#fef9ef", outline="#000000", width=18)
    d.line([c - 68, c + 100, c + 68, c + 100], fill="#000000", width=12)
    d.line([c - 68, c + 136, c + 44, c + 136], fill="#000000", width=12)
    # 几何装饰
    d.polygon([(S * 0.73, S * 0.24), (S * 0.84, S * 0.33), (S * 0.71, S * 0.41)], fill="#ff9ff3", outline="#000000")
    d.ellipse([S * 0.19, S * 0.27, S * 0.25, S * 0.33], fill="#000000")
    d.rectangle([S * 0.76, S * 0.66, S * 0.86, S * 0.72], fill="#1dd1a1", outline="#000000", width=10)
    return img


def save(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path, "PNG")


def main():
    legacy = draw(False)
    for folder, size in [
        ("mipmap-mdpi", 48),
        ("mipmap-hdpi", 72),
        ("mipmap-xhdpi", 96),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi", 192),
    ]:
        save(legacy, os.path.join(RES, folder, "ic_launcher.png"), size)
    # 自适应图标前景：108dp 画布，内容在安全区内
    save(draw(True), os.path.join(RES, "drawable", "ic_launcher_foreground.png"), 432)
    print("icons written")


if __name__ == "__main__":
    main()
