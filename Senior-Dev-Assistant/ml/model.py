from sklearn.ensemble import RandomForestClassifier

def get_model():
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=None,
        random_state=42
    )
    return model
