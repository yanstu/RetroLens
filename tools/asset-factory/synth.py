import numpy as np
from scipy.io import wavfile
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '../../src/static/sounds')
os.makedirs(OUTPUT_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def save_wav(name, audio_data):
    # 标准化至 16-bit PCM
    audio_data = np.int16(audio_data / np.max(np.abs(audio_data)) * 32767)
    wavfile.write(os.path.join(OUTPUT_DIR, name), SAMPLE_RATE, audio_data)

def generate_shutter():
    """ 机械快门: 高频击打(Click) + 低频回声(Thump) """
    # Click (0.05秒的衰减正弦叠加)
    t1 = np.linspace(0, 0.05, int(SAMPLE_RATE * 0.05), endpoint=False)
    click = np.sin(2 * np.pi * 800 * t1) * np.exp(-t1 * 100)
    
    # Thump (低频回弹)
    t2 = np.linspace(0, 0.1, int(SAMPLE_RATE * 0.1), endpoint=False)
    thump = np.sin(2 * np.pi * 100 * t2) * np.exp(-t2 * 40)
    
    # 组装
    audio = np.zeros(int(SAMPLE_RATE * 0.15))
    audio[:len(click)] += click
    audio[len(click)-200 : len(click)-200+len(thump)] += thump * 0.8
    return audio

def generate_film_wind():
    """ 胶卷过卷: 节奏性刮擦声 (带滤波的白噪音与低频包络) """
    duration = 0.6
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise = np.random.normal(0, 1, len(t))
    # 模拟齿轮转动的节奏包络
    envelope = np.abs(np.sin(2 * np.pi * 8 * t)) * np.exp(-t * 2)
    return noise * envelope * 0.4

def generate_static():
    """ Lo-Fi 电流声: 粉红噪音近似算法 """
    duration = 2.0
    noise = np.random.normal(0, 1, int(SAMPLE_RATE * duration))
    # 通过积分累加降低高频分量，模拟低频底噪
    pink_noise = np.cumsum(noise)
    pink_noise = pink_noise - np.mean(pink_noise)
    return pink_noise

if __name__ == "__main__":
    print("[RetroLens Audio Factory] Generating audio assets...")
    save_wav('shutter.wav', generate_shutter())
    save_wav('wind.wav', generate_film_wind())
    save_wav('static.wav', generate_static())
    print(f"✅ Success: Audio assets saved to {OUTPUT_DIR}/")
