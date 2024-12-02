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
    qrcontent = qrcontent.toString();
    const [hexIv, hexCiphertext] = qrcontent.split("#");

    const iv = CryptoJS.enc.Hex.parse(hexIv);
    const ciphertext = CryptoJS.enc.Hex.parse(hexCiphertext);

    const key = CryptoJS.enc.Utf8.parse("mysecretaeskey16");
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
      iv: iv,
    });

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    console.log(decryptedStr);
    updatedetails(decryptedStr);
  } catch (err) {
    console.log(err);
    console.log("Invalid QR");
    colorcode.style.background = "red";
    statustext.innerText = "INVALID";
  }
}

let lastbarcodes = [];

function arraysAreEqual(arr1, arr2) {
  // if (arr1.length !== arr2.length) return false;
  // return arr1.every((obj1, index) => {
  //   const obj2 = arr2[index];

  //   return obj1.rawValue === obj2.rawValue && obj1.format === obj2.format;
  // });

  return _.isEqual(arr1[0], arr2[0]);
}

function decodeBarcode(barcodes) {
  if (!arraysAreEqual(barcodes, lastbarcodes)) {
    console.log(barcodes); // Logs only when contents change
    lastbarcodes = [...barcodes]; // Update last known barcodes
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
function scanBarcode() {
  Quagga.init(
    {
      inputStream: {
        type: "LiveStream",
        target: video,
        constraints: {
          facingMode: "environment",
          width: 640,
          height: 480,
        },
      },
      decoder: {
        readers: ["code_128_reader"],
      },
      locate: true,
      src: video,
    },
    function (err) {
      if (err) {
        console.log("Quagga initialization failed: ", err);
        return;
      }
      console.log("Quagga initialized successfully!");
      Quagga.start();
    }
  );

  Quagga.onDetected(function (result) {
    if (result && result.codeResult) {
      console.log("Barcode detected: ", result.codeResult.code);
    }
  });
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

function extractFrame() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const framedata = context.getImageData(0, 0, canvas.width, canvas.height);
  const frameurl = canvas.toDataURL();

  scanQR(framedata);
  barcodeScan(framedata)
    .then((barcodes) => {
      decodeBarcode(barcodes);
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
  lastbarcodes = [];

  colorcode.style.background = "yellow";
  statustext.innerText = "Scan";
});

exitbutton.addEventListener("click", () => {
  entrybutton.className = "notactive";
  exitbutton.className = "active";
  active = "exit";
  lastQRContent = "";
  lastbarcodes = [];
  colorcode.style.background = "yellow";
  statustext.innerText = "Scan";
});

video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  requestAnimationFrame(extractFrame);
});
