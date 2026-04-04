import joblib
import numpy as np
from processor import EEGProcessor

proc = EEGProcessor() # This loads your .pkl files

# Test a file you KNOW is Happy
test_file = "data/happy1.csv"
features = proc.process_signal(test_file)

# See what the model thinks BEFORE any dictionary mapping
raw_probs, prediction, confidence = proc.predict_emotion(features)

print(f"Testing File: {test_file}")
print(f"Raw Prediction Index: {prediction}") 
print(f"Probabilities: {raw_probs}")