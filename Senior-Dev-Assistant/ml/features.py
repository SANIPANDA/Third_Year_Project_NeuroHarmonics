import numpy as np

def extract_features(X):
    feature_list = []

    for row in X:
        features = [
            np.mean(row),
            np.std(row),
            np.var(row),
            np.max(row),
            np.min(row)
        ]
        feature_list.append(features)

    return np.array(feature_list)
