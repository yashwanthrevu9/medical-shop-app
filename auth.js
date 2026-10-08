if (localStorage.getItem("loggedIn") === "true") {
  window.location.href = "index.html";
}

let generatedOTP = "";

function sendOTP() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Enter your email.");
    return;
  }

  generatedOTP = String(Math.floor(1000 + Math.random() * 9000));
  alert("Demo OTP: " + generatedOTP);
  document.getElementById("otpBox").classList.remove("hidden");
}

function verifyOTP() {
  const userOTP = document.getElementById("otp").value.trim();

  if (!generatedOTP) {
    alert("Send the OTP first.");
    return;
  }

  if (userOTP === generatedOTP) {
    localStorage.setItem("loggedIn", "true");
    window.location.href = "index.html";
    return;
  }

  alert("Wrong OTP.");
}
