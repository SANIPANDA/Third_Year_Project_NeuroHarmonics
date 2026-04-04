import cv2
import numpy as np
import tkinter as tk
from tkinter import filedialog
from PIL import Image, ImageTk
from keras.models import model_from_json

# =========================
# EMOTION STYLES
# =========================
EMOTION_INFO = {
    'angry': {'color': '#ef5350', 'emoji': '😠'},
    'disgust': {'color': '#66bb6a', 'emoji': '🤢'},
    'fear': {'color': '#42a5f5', 'emoji': '😱'},
    'happy': {'color': '#ffeb3b', 'emoji': '😊'},
    'neutral': {'color': '#b0bec5', 'emoji': '😐'},
    'sad': {'color': '#2196f3', 'emoji': '😢'},
    'surprise': {'color': '#ff9800', 'emoji': '😲'},
    'no face': {'color': '#757575', 'emoji': '❓'}
}

# =========================
# LOAD MODEL
# =========================
def load_emotion_model():
    with open("emotiondetector.json", "r") as f:
        model_json = f.read()
    model = model_from_json(model_json)
    model.load_weights("emotiondetector.h5")
    return model

# =========================
# PREDICTION
# =========================
def extract_features(img):
    img = np.array(img).reshape(1, 48, 48, 1)
    return img / 255.0

def predict_emotion(model, face):
    labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
    pred = model.predict(extract_features(face), verbose=0)
    return labels[int(np.argmax(pred))]

# =========================
# MAIN APP
# =========================
class EmotionApp(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("🎭 Emotion Detection Studio")
        self.geometry("1200x800")
        self.minsize(900, 600)
        self.configure(bg="#f3e5f5")

        self.model = load_emotion_model()
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

        self.cap = None
        self.current_frame = None

        self.main_frame = tk.Frame(self, bg="#f3e5f5")
        self.main_frame.pack(fill="both", expand=True)

        self.show_home()

    # =========================
    def clear(self):
        for w in self.main_frame.winfo_children():
            w.destroy()

    # =========================
    # HOME
    # =========================
    def show_home(self):
        self.clear()

        tk.Label(self.main_frame, text="🎭 Emotion Detection Studio",
                 font=("Arial", 32, "bold"),
                 bg="#f3e5f5", fg="#7b1fa2").pack(pady=40)

        tk.Button(self.main_frame, text="📸 LIVE CAMERA",
                  font=("Arial", 18, "bold"),
                  bg="#9c27b0", fg="white",
                  command=self.open_camera_mode).pack(pady=15)

        tk.Button(self.main_frame, text="🖼️ BROWSE IMAGE",
                  font=("Arial", 18, "bold"),
                  bg="#2196f3", fg="white",
                  command=self.open_browse_mode).pack(pady=15)

        tk.Button(self.main_frame, text="❌ EXIT",
                  font=("Arial", 16, "bold"),
                  bg="#f44336", fg="white",
                  command=self.destroy).pack(pady=20)

    # =========================
    # CAMERA MODE
    # =========================
    def open_camera_mode(self):
        self.clear()

        # 🔥 EXPANDED Y + COMPRESSED X FRAME
        self.display_frame = tk.Frame(self.main_frame, bg="black")
        self.display_frame.place(relx=0.1, rely=0.05, relwidth=0.8, relheight=0.45)

        self.display = tk.Label(self.display_frame, bg="black")
        self.display.pack(fill="both", expand=True)

        # RESULT
        self.result_label = tk.Label(self.main_frame,
                                    text="Emotion: ---",
                                    font=("Arial", 24, "bold"),
                                    bg="#f3e5f5")
        self.result_label.place(relx=0.5, rely=0.6, anchor="center")

        # BUTTONS
        btn_frame = tk.Frame(self.main_frame, bg="#f3e5f5")
        btn_frame.place(relx=0.5, rely=0.85, anchor="center")

        tk.Button(btn_frame, text="🎯 CAPTURE",
                  bg="#4caf50", fg="white",
                  font=("Arial", 14, "bold"),
                  command=self.capture_emotion).pack(side="left", padx=10)

        tk.Button(btn_frame, text="↩️ BACK",
                  bg="#ff9800", fg="white",
                  font=("Arial", 14, "bold"),
                  command=self.back_to_home).pack(side="left", padx=10)

        tk.Button(btn_frame, text="❌ EXIT",
                  bg="#f44336", fg="white",
                  font=("Arial", 14, "bold"),
                  command=self.destroy).pack(side="left", padx=10)

        self.cap = cv2.VideoCapture(0)
        self.update_camera()

    def update_camera(self):
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                self.current_frame = frame
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(rgb)

                w = self.display.winfo_width()
                h = self.display.winfo_height()

                if w > 0 and h > 0:
                    img = img.resize((w, h))

                imgtk = ImageTk.PhotoImage(img)
                self.display.configure(image=imgtk)
                self.display.image = imgtk

        self.after(30, self.update_camera)

    def capture_emotion(self):
        if self.current_frame is None:
            return

        gray = cv2.cvtColor(self.current_frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        emotion = 'no face'

        if len(faces) > 0:
            x, y, w, h = faces[0]
            face = cv2.resize(gray[y:y+h, x:x+w], (48, 48))
            emotion = predict_emotion(self.model, face)

        info = EMOTION_INFO[emotion]
        self.result_label.config(
            text=f"{info['emoji']} {emotion.upper()}",
            fg=info['color']
        )

    # =========================
    # IMAGE MODE
    # =========================
    def open_browse_mode(self):
        self.clear()

        self.display_frame = tk.Frame(self.main_frame, bg="black")
        self.display_frame.place(relx=0.1, rely=0.05, relwidth=0.8, relheight=0.45)

        self.display = tk.Label(self.display_frame, bg="black")
        self.display.pack(fill="both", expand=True)

        self.result_label = tk.Label(self.main_frame,
                                    text="Emotion: ---",
                                    font=("Arial", 24, "bold"),
                                    bg="#f3e5f5")
        self.result_label.place(relx=0.5, rely=0.6, anchor="center")

        btn_frame = tk.Frame(self.main_frame, bg="#f3e5f5")
        btn_frame.place(relx=0.5, rely=0.85, anchor="center")

        tk.Button(btn_frame, text="📁 BROWSE",
                  bg="#ff5722", fg="white",
                  command=self.browse_image).pack(side="left", padx=10)

        tk.Button(btn_frame, text="↩️ BACK",
                  bg="#607d8b", fg="white",
                  command=self.show_home).pack(side="left", padx=10)

        tk.Button(btn_frame, text="❌ EXIT",
                  bg="#f44336", fg="white",
                  command=self.destroy).pack(side="left", padx=10)

    def browse_image(self):
        path = filedialog.askopenfilename(
            filetypes=[("Images", "*.png *.jpg *.jpeg")]
        )
        if path:
            self.process_image(path)

    def process_image(self, path):
        frame = cv2.imread(path)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(rgb)

        w = self.display.winfo_width()
        h = self.display.winfo_height()

        if w > 0 and h > 0:
            img = img.resize((w, h))

        imgtk = ImageTk.PhotoImage(img)
        self.display.configure(image=imgtk)
        self.display.image = imgtk

        self.detect(frame)

    def detect(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        emotion = 'no face'

        if len(faces) > 0:
            x, y, w, h = faces[0]
            face = cv2.resize(gray[y:y+h, x:x+w], (48, 48))
            emotion = predict_emotion(self.model, face)

        info = EMOTION_INFO[emotion]
        self.result_label.config(
            text=f"{info['emoji']} {emotion.upper()}",
            fg=info['color']
        )

    # =========================
    def back_to_home(self):
        if self.cap:
            self.cap.release()
            self.cap = None
        self.show_home()


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app = EmotionApp()
    app.mainloop()