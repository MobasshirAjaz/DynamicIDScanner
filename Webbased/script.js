//import { caesarcipher, decryptQR } from "../../DynamicIDServer/encrypt";

const video = document.getElementById("camerafeed");
const canvas = document.getElementById("frameCanvas");
const context = canvas.getContext("2d");

const colorcode = document.getElementsByClassName("colorcode")[0];
const statustext = document.getElementsByClassName("statustext")[0];

colorcode.style.background = "yellow";
statustext.innerText = "Scan";

const usrname = document.getElementById("name");
const roll = document.getElementById("roll");
const year = document.getElementById("year");

let active = "entry";

let time = new Date();

function setstatus(data) {
  if (data.status === "dont_allow") {
    colorcode.style.background = "red";
    statustext.innerText = "Stop";
  } else if (data.status === "invalid") {
    colorcode.style.background = "red";
    statustext.innerText = "INVALID";
  } else if (data.status === "allow") {
    colorcode.style.background = "green";
    statustext.innerText = "GO";
    setTimeout(() => {
      colorcode.style.background = "yellow";
      statustext.innerText = "Scan";
    }, 2000);
  }
}
function validateQR(roll) {
  if (active === "entry") {
    console.log("entered");
    fetch("http://localhost:3000/entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roll: roll }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Entry Success:", data);
        setstatus(data);
        extractFrame();
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } else {
    fetch("http://localhost:3000/exit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roll: roll }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Exit Success:", data);
        setstatus(data);
        extractFrame();
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
}
function updatedetails(decryptedStr) {
  const [nm, rl, yr] = decryptedStr.split("#");
  console.log(nm);

  usrname.innerText = "Name: " + nm;
  roll.innerText = "Roll: " + rl;
  year.innerText = "Year: " + yr;

  validateQR(rl);
}
function decodeQR(qrcontent) {
  try {
    decryptedStr = decryptQR(qrcontent);

    updatedetails(decryptedStr);
  } catch (err) {
    console.log(err);
    console.log("Invalid QR");
    colorcode.style.background = "red";
    statustext.innerText = "INVALID";
  }
}

function validateBarcode(decryptedbarcode) {
  const regex = /^\d{2}:\d{2}:\d{2}$/;
  if (regex.test(decryptedbarcode)) {
    const currentTime = new Date(); // Get the current time
    const currentTimeInSeconds =
      currentTime.getHours() * 3600 +
      currentTime.getMinutes() * 60 +
      currentTime.getSeconds(); // Convert current time to seconds

    // Parse the input time string (in hh:mm:ss format)
    const [hours, minutes, seconds] = decryptedbarcode.split(":").map(Number);
    const inputTimeInSeconds = hours * 3600 + minutes * 60 + seconds;

    // Calculate the time difference and check if it's within ±3 seconds
    const difference = Math.abs(currentTimeInSeconds - inputTimeInSeconds);

    if (difference <= 300) console.log("Barcode valid");
    else console.log("Barcode invalid");
  }
}
function decodeBarcode(barcodecontent) {
  try {
    barcodecontent = barcodecontent[0].rawValue.toString();
    console.log(barcodecontent);

    let decryptedbarcode = caesarcipher(barcodecontent, -5);
    console.log(decryptedbarcode);
    validateBarcode(decryptedbarcode);
  } catch (err) {
    console.log("barcode detection error.");
  }
}

let lastQRContent = "";
function scanQR(imageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (code) {
    let qrcontent = code.data;
    if (qrcontent !== lastQRContent) {
      console.log("QR content changed: ", qrcontent);
      lastQRContent = qrcontent;
      setTimeout(() => {
        lastQRContent = "";
      }, 3500); //to allow successive same qr scans but not to get infinite decoding.
      decodeQR(qrcontent);
    }
  }
}

async function barcodeScan(imageData) {
  try {
    const detector = new BarcodeDetector({
      formats: ["code_39", "code_128", "ean_13"],
    });
    const barcodes = await detector.detect(imageData);
    return barcodes;
  } catch (err) {
    console.log(err);
  }
}

if (video && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (stream) {
      video.srcObject = stream;
      //scanBarcode();
    })
    .catch(function (error) {
      console.log("Something went wrong!: ", error);
    });
} else {
  console.log("video error");
}

let lastbarcodes = [];
function extractFrame() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const framedata = context.getImageData(0, 0, canvas.width, canvas.height);
  const frameurl = canvas.toDataURL();

  scanQR(framedata);
  barcodeScan(framedata)
    .then((barcodes) => {
      if (JSON.stringify(barcodes[0]) !== JSON.stringify(lastbarcodes[0])) {
        decodeBarcode(barcodes);
        lastbarcodes = [...barcodes];
      }
    })
    .catch((error) => {
      console.error("Barcode detection failed:", error);
    });

  setTimeout(requestAnimationFrame(extractFrame), 100);
}

const entrybutton = document.getElementById("entry");
const exitbutton = document.getElementById("exit");

entrybutton.addEventListener("click", () => {
  entrybutton.className = "active";
  exitbutton.className = "notactive";
  active = "entry";
  lastQRContent = "";

  colorcode.style.background = "yellow";
  statustext.innerText = "Scan";
});

exitbutton.addEventListener("click", () => {
  entrybutton.className = "notactive";
  exitbutton.className = "active";
  active = "exit";
  lastQRContent = "";

  colorcode.style.background = "yellow";
  statustext.innerText = "Scan";
});

video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  requestAnimationFrame(extractFrame);
});
