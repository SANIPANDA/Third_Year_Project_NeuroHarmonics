# NeuroHarmonics: EEG-Based Emotion Recognition & Wellness System

**NeuroHarmonics** is an advanced Human-Computer Interaction (HCI) platform that bridges the gap between neural activity and emotional well-being. By analyzing real-time EEG (Electroencephalogram) signals, the system identifies the user's emotional state and leverages Generative AI to provide personalized wellness interventions.

This project implements a complete signal processing pipeline—from raw data acquisition and artifact removal to machine learning-based classification and AI-driven recommendations.

---

##  Project Methodology (The 11-Step Pipeline)

NeuroHarmonics operates on a strictly defined biological signal processing workflow:

1.  **Signal Acquisition**: Ingests EEG data in `.edf` or `.csv` (14-channel) formats.
2.  **Bandpass Filtering**: Removes low-frequency drifts and high-frequency noise ($0.5$–$50$Hz).
3.  **Notch Filtering**: Eliminates $50$Hz power line interference.
4.  **Artifact Removal**: Applies Common Average Referencing (CAR) to isolate neural signals.
5.  **Segmentation**: Divides continuous data into $2.0$-second overlapping windows.
6.  **Welch PSD**: Computes Power Spectral Density to move from time-domain to frequency-domain.
7.  **Feature Extraction**: Isolates power values for Delta, Theta, Alpha, Beta, and Gamma bands.
8.  **Relative Power Normalization**: Converts raw power into percentage-based features for stability.
9.  **ML Classification**: Predicts emotional state using a Random Forest Classifier.
10. **Confidence Analysis**: Generates a statistical distribution of emotional probability.
11. **AI Recommendation**: Uses Gemini 1.5 Flash to suggest exercises based on the detected state.

---

##  Project Structure

```text
NeuroHarmonics/
├── app.py                # Flask Server: Manages API routes & Gemini integration
├── processor.py          # The Logic Core: EEGProcessor class & Signal Math
├── train_model.py        # ML Training: Generates the 'your_trained_model.pkl'
├── make_test_files.py    # Simulation: Generates synthetic EEG for Demo
├── your_trained_model.pkl # The 'Brain': Serialized Random Forest Model
├── static/
│   ├── css/              # UI Customization
│   └── js/               # Frontend interactivity & Chart.js integration
├── templates/
│   └── dashboard.html    # Main Web Interface
└── requirements.txt      # List of necessary Python libraries
```

---

##  Installation & Execution

### 1. Environment Setup
Ensure you are using Python 3.12. It is recommended to use a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies
Run the following command to install the neuroimaging and AI libraries:
```bash
pip install flask mne pandas numpy scikit-learn matplotlib joblib google-genai
```

### 3. Initialize the Model
Before launching the web app, you must train the classifier so it understands the frequency-to-emotion mapping:
```bash
python train_model.py
```

### 4. Start the System
Launch the Flask backend:
```bash
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000`.

---

##  Technical Standards

| Feature | Specification |
| :--- | :--- |
| **Sampling Frequency** | $256$ Hz (Default) |
| **Bands Monitored** | Delta ($0.5$-$4$Hz), Theta ($4$-$8$Hz), Alpha ($8$-$13$Hz), Beta ($13$-$30$Hz) |
| **Classifier** | Random Forest (Ensemble Learning) |
| **AI Model** | Google Gemini 1.5 Flash |
| **Visualization** | Matplotlib (Agg Non-Interactive Backend) |

---

##  Future Enhancements
* **Hardware Integration**: Expanding support for consumer-grade BCI headsets like Emotiv or Muse.
* **Temporal Tracking**: Adding a database to track emotional trends over weeks/months.
* **Deep Learning**: Implementing 1D-CNN (Convolutional Neural Networks) for automated feature discovery.

---

**Developed By:** Aratrika Panda  ,Ariyanka Panda, Ashreya Awasthi
**Academic Institution:** Banasthali Vidyapith  
**Specialization:** B.Tech Computer Science and Artificial Intelligence
