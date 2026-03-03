
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