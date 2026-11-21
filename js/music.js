//音乐播放逻辑
document.addEventListener("DOMContentLoaded", function () {
    const musicBtn = document.getElementById('music-toggle');
    const musicIcon = document.getElementById('music-icon');

    // 创建音频对象；不预加载，避免 6MB 背景音乐拖慢首屏和立绘显示。
    const bgm = new Audio('bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.3;
    bgm.preload = 'none';

    musicIcon.textContent = '𝆔';

    // 浏览器普遍禁止无交互自动播放；等用户第一次点击页面再尝试播放。
    document.addEventListener('click', function startMusic() {
        if (bgm.paused) {
            bgm.play().then(function () {
                musicIcon.textContent = '𝆕';
            }).catch(function () {
                musicIcon.textContent = '𝆔';
            });
        }

        document.removeEventListener('click', startMusic);
    }, { once: true });

    if (musicBtn) {
        musicBtn.addEventListener('click', function (e) { 
            e.stopPropagation();

            if (bgm.paused) {
                bgm.play().then(function () {
                    musicIcon.textContent = '𝆕';
                }).catch(function () {
                    musicIcon.textContent = '𝆔';
                });
            } else {
                bgm.pause();
                musicIcon.textContent = '𝆔';
            }
        });
    }
});
