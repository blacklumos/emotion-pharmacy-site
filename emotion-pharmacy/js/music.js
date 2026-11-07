//音乐播放逻辑
document.addEventListener("DOMContentLoaded", function () {
    const musicBtn = document.getElementById('music-toggle');
    const musicIcon = document.getElementById('music-icon');

    // 创建音频对象
    const bgm = new Audio('bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.3;

    musicIcon.textContent = '𝆕';

    bgm.play().catch(error => {
        console.log("浏览器拦截了自动播放，等待用户点击页面任意位置后播放。");
    });

    document.addEventListener('click', function startMusic() {
        if (bgm.paused) {
            bgm.play();
            musicIcon.textContent = '𝆕';
        }

        document.removeEventListener('click', startMusic);
    }, { once: true });

    if (musicBtn) {
        musicBtn.addEventListener('click', function (e) { 
            e.stopPropagation();

            if (bgm.paused) {
                bgm.play();
                musicIcon.textContent = '𝆕';
            } else {
                bgm.pause();
                musicIcon.textContent = '𝆔';
            }
        });
    }
});
