
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tabs = document.querySelectorAll(".tab");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault(); //stops page refresh
      login();
    });
  } 
});

function showLogin() {
  
  window.location.href ="/login";
}

function showRegister() {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  tabs[1].classList.add("active");
  tabs[0].classList.remove("active");
}


async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    console.log("LOGIN: email=", email, "password=", password);
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);
      if (data.success) {
        // For now treat this as user login and go to user dashboard.
        // If you later add role-based redirects, you can switch on data.role here.
        window.location.href = "/dashboard";
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Server error. Check console.");
    }
  }


  // Function 1: Request the Reset OTP
async function forgotPassword() {
    const email = document.getElementById("email").value;
    
    if (!email || !isValidEmail(email)) {
        alert("Please enter your email address first so we know where to send the code.");
        return;
    }

    try {
        const res = await fetch("/forgot_password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
            alert("A reset code has been sent to your email!");
            document.getElementById('reset-section').style.display = 'block';
            document.getElementById('login-btn').style.display = 'none'; // Hide login button to focus on reset
        } else {
            alert(data.error || "Email not found in our records.");
        }
    } catch (err) {
        console.error("FORGOT PASS ERROR:", err);
    }
}

// Function 2: Verify OTP and update password in Supabase
async function verifyResetAndChange() {
    const email = document.getElementById("email").value;
    const otp = document.getElementById("reset-otp").value;
    const newPassword = document.getElementById("new-password").value;

    if (!otp || !newPassword) {
        alert("Please enter the OTP and your new password.");
        return;
    }

    if (!isStrongPassword(newPassword)) {
        alert("New password is too weak.");
        return;
    }

    try {
        const res = await fetch("/reset_password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();

        if (data.success) {
            alert("Password updated! You can now sign in with your new password.");
            location.reload(); // Refresh to reset the form
        } else {
            alert(data.error || "Invalid OTP or session expired.");
        }
    } catch (err) {
        console.error("RESET ERROR:", err);
    }
}



 async function register() {
    const fullName = document.querySelector("#registerForm input[type='text']").value;
    const email = document.querySelector("#registerForm input[type='email']").value;
    const password = document.querySelector("#registerForm input[type='password']").value;
    console.log("REGISTER: fullName=", fullName, "email=", email, "password=", password);
    
    if (!fullName || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    // Client-side validation
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (!isStrongPassword(password)) {
      alert("Password must be at least 8 characters with uppercase, lowercase, and numbers");
      return;
    }

    if (!isValidName(fullName)) {
      alert("Name must contain only letters and spaces");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fullName, email, password })
      });
      const data = await res.json();
      console.log("REGISTER RESPONSE:", data);
      if (data.success) {
        // User is logged in on the server; go straight to user dashboard.
        window.location.href = "/dashboard";
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      alert("Server error. Check console.");
    }
  }

// Validation helper functions
function isValidEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

function isValidName(name) {
  const pattern = /^[a-zA-Z\s]+$/;
  return pattern.test(name);
}

function slideRight() {
  const slider = document.getElementById('testimonialSlider');
  const cardWidth = 345; // Card (320px) + Gap (25px)
  
  // If at the very end, scroll back to the beginning
  if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10) {
    slider.scrollTo({ left: 0, behavior: 'smooth' });
  } else {
    slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
  }
}

// Scroll Reveal Animation
const revealElements = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target); // animate only once
      }
    });
  },
  {
    threshold: 0.15
  }
);

revealElements.forEach(el => observer.observe(el));

// Function for the main login page button
function goToAdminLogin() {
    // Redirects to a new dedicated admin login page
    window.location.href = "/admin-login-page";
}

// Function to be used on the NEW admin login page (e.g., admin_login.html)
async function submitAdminAuth() {
    const userVal = document.getElementById('adminUsername').value;
    const passVal = document.getElementById('adminPassword').value;

    const response = await fetch('/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: userVal,
            password: passVal
        })
    });

    const result = await response.json();

    if (result.success) {
        // Successful login sends them to the dashboard we built
        window.location.href = result.redirect;
    } else {
        // Show error if credentials don't match Supabase 'admins' table
        alert("Access Denied: " + result.message);
    }
}

// Function to enable/disable the button based on input
function checkRegFields() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const btn = document.getElementById('validate-mail-btn');

    if (name && email && pass && isValidEmail(email)) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
}

// STEP 1: Send the OTP
async function sendRegistrationOTP() {
    const email = document.getElementById('reg-email').value;
    const btn = document.getElementById('validate-mail-btn');

    btn.innerText = "Sending Code...";
    
    try {
        const res = await fetch("/send_otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('otp-section').style.display = 'block';
            btn.style.display = 'none'; // Hide the validate button
            alert("Success! Check your email for the OTP.");
        } else {
            alert(data.error || "Error sending mail.");
            btn.innerText = "Validate Mail →";
        }
    } catch (err) {
        console.error(err);
        alert("Server error. Make sure Flask-Mail is configured.");
    }
}

// STEP 2: Verify OTP and Redirect
async function verifyAndRegister() {
    const fullName = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const otp = document.getElementById('reg-otp').value;

    if (otp.length !== 6) return alert("Please enter a 6-digit code.");

    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, email, password, otp })
        });
        const data = await res.json();

        if (data.success) {
            // Success! Redirect to dashboard
            window.location.href = "/dashboard";
        } else {
            alert(data.error || "Invalid OTP code.");
        }
    } catch (err) {
        console.error("Verification error:", err);
    }
}