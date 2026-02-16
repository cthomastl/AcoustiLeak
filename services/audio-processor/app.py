"""
AcoustiLeak Audio Processor Service
Analyzes audio signals to detect gas leak signatures.
Uses FFT-based frequency analysis to identify the high-frequency "hiss"
of escaping methane while filtering out wind, machinery, and bird noise.
"""

import os

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy import signal
from scipy.fft import fft, fftfreq

app = Flask(__name__)
CORS(app)

# ──────────────────────────────────────────────
#  Frequency band definitions (Hz)
# ──────────────────────────────────────────────
# Gas leaks produce broadband high-frequency noise, typically 20-40 kHz
# These bands help classify what the microphone is picking up
NOISE_PROFILES = {
    "wind":       {"low": 20,    "high": 500,   "label": "wind"},
    "machinery":  {"low": 100,   "high": 2000,  "label": "machinery"},
    "bird":       {"low": 1000,  "high": 8000,  "label": "bird"},
    "gas_leak":   {"low": 10000, "high": 22000, "label": "gas_leak"},
}

# Detection thresholds
LEAK_CONFIDENCE_THRESHOLD = 0.6
HIGH_FREQ_ENERGY_THRESHOLD = 0.3


def generate_simulated_audio(scenario="normal", duration=1.0, sample_rate=44100):
    """
    Generate simulated audio data for testing.
    In production, this would be replaced by real microphone input.
    """
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    noise = np.random.normal(0, 0.01, len(t))

    if scenario == "leak":
        # Gas leak: broadband high-frequency hiss (10-22 kHz)
        leak_signal = 0.3 * np.random.normal(0, 1, len(t))
        # Band-pass filter to leak frequency range
        sos = signal.butter(4, [10000, 20000], btype="band", fs=sample_rate, output="sos")
        leak_signal = signal.sosfilt(sos, leak_signal)
        return noise + leak_signal

    elif scenario == "wind":
        # Wind: low-frequency rumble
        wind = 0.2 * np.sin(2 * np.pi * 50 * t) + 0.1 * np.sin(2 * np.pi * 120 * t)
        return noise + wind

    elif scenario == "machinery":
        # Machinery: periodic mid-frequency hum with harmonics
        machine = 0.15 * np.sin(2 * np.pi * 500 * t) + 0.1 * np.sin(2 * np.pi * 1000 * t)
        return noise + machine

    elif scenario == "bird":
        # Bird: chirps in the 2-6 kHz range
        bird = 0.1 * np.sin(2 * np.pi * 3000 * t) * (1 + 0.5 * np.sin(2 * np.pi * 10 * t))
        return noise + bird

    # Normal: just background noise
    return noise


def analyze_frequency_spectrum(audio_data, sample_rate=44100):
    """
    Perform FFT analysis and compute energy in each frequency band.
    Returns band energies and the dominant classification.
    """
    n = len(audio_data)
    yf = np.abs(fft(audio_data))[:n // 2]
    xf = fftfreq(n, 1 / sample_rate)[:n // 2]

    total_energy = np.sum(yf ** 2)
    if total_energy == 0:
        total_energy = 1e-10  # avoid division by zero

    band_energies = {}
    for name, band in NOISE_PROFILES.items():
        mask = (xf >= band["low"]) & (xf < band["high"])
        band_energy = np.sum(yf[mask] ** 2) / total_energy
        band_energies[name] = float(band_energy)

    # Find peak frequency
    peak_idx = np.argmax(yf)
    peak_frequency = float(xf[peak_idx])

    # Average amplitude
    avg_amplitude = float(np.mean(np.abs(audio_data)))

    # Noise floor estimate (median of lower frequencies)
    low_mask = xf < 500
    noise_floor = float(np.median(yf[low_mask])) if np.any(low_mask) else 0.0

    return {
        "band_energies": band_energies,
        "peak_frequency_hz": peak_frequency,
        "avg_amplitude": avg_amplitude,
        "noise_floor": noise_floor,
    }


def classify_audio(band_energies):
    """
    Classify the audio based on frequency band energy distribution.
    Returns classification label and leak confidence score.
    """
    gas_energy = band_energies.get("gas_leak", 0)
    wind_energy = band_energies.get("wind", 0)
    machine_energy = band_energies.get("machinery", 0)
    bird_energy = band_energies.get("bird", 0)

    # Leak confidence: ratio of gas-leak band energy vs other noise
    other_energy = wind_energy + machine_energy + bird_energy
    if other_energy > 0:
        leak_confidence = gas_energy / (gas_energy + other_energy)
    else:
        leak_confidence = gas_energy

    leak_confidence = min(max(leak_confidence, 0.0), 1.0)

    # Classification logic
    if leak_confidence > LEAK_CONFIDENCE_THRESHOLD:
        if leak_confidence > 0.85:
            classification = "leak_confirmed"
        else:
            classification = "leak_suspected"
    elif wind_energy > 0.4:
        classification = "wind"
    elif machine_energy > 0.3:
        classification = "machinery"
    elif bird_energy > 0.2:
        classification = "bird"
    else:
        classification = "normal"

    return classification, leak_confidence


# ──────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "service": "audio-processor",
        "status": "running",
    })


@app.route("/process", methods=["POST"])
def process_audio():
    """
    Analyze audio data for gas leak detection.

    Accepts either:
      - Raw audio samples in the request body (audio_data field)
      - A scenario name for simulated data (scenario field) — useful for testing
    """
    data = request.get_json()
    sample_rate = data.get("sample_rate", 44100)
    duration = data.get("duration_seconds", 1.0)

    if "audio_data" in data:
        audio = np.array(data["audio_data"], dtype=np.float64)
    else:
        # Use simulated data for testing
        scenario = data.get("scenario", "normal")
        audio = generate_simulated_audio(scenario, duration, sample_rate)

    # Run FFT analysis
    spectrum = analyze_frequency_spectrum(audio, sample_rate)

    # Classify the audio
    classification, leak_confidence = classify_audio(spectrum["band_energies"])

    result = {
        "sensor_id": data.get("sensor_id"),
        "sample_rate": sample_rate,
        "duration_seconds": duration,
        "peak_frequency_hz": spectrum["peak_frequency_hz"],
        "avg_amplitude": spectrum["avg_amplitude"],
        "high_freq_energy": spectrum["band_energies"].get("gas_leak", 0),
        "noise_floor": spectrum["noise_floor"],
        "band_energies": spectrum["band_energies"],
        "classification": classification,
        "leak_confidence": round(leak_confidence, 4),
    }

    return jsonify(result)


@app.route("/simulate", methods=["POST"])
def simulate():
    """
    Generate and analyze simulated audio for a given scenario.
    Useful for testing and demos.
    Scenarios: normal, leak, wind, machinery, bird
    """
    data = request.get_json() or {}
    scenario = data.get("scenario", "normal")
    sample_rate = data.get("sample_rate", 44100)
    duration = data.get("duration_seconds", 1.0)

    audio = generate_simulated_audio(scenario, duration, sample_rate)
    spectrum = analyze_frequency_spectrum(audio, sample_rate)
    classification, leak_confidence = classify_audio(spectrum["band_energies"])

    return jsonify({
        "scenario_requested": scenario,
        "classification": classification,
        "leak_confidence": round(leak_confidence, 4),
        "band_energies": spectrum["band_energies"],
        "peak_frequency_hz": spectrum["peak_frequency_hz"],
        "avg_amplitude": spectrum["avg_amplitude"],
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
