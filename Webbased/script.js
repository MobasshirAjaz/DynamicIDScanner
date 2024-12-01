const video = document.getElementById("camerafeed");
const canvas = document.getElementById("frameCanvas");
const context = canvas.getContext("2d");

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
  } catch (err) {
    console.log("Invalid QR code");
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
      decodeQR(qrcontent);
    }
  }
}

function barcodeScan(imageData) {
  if (!("BarcodeDetector" in globalThis)) {
    console.log("Barcode Detector is not supported by this browser.");
  } else {
    console.log("Barcode Detector supported!");
  }
  const barcodeDetector = new BarcodeDetector({
    formats: ["code_39", "codabar", "ean_13"],
  });
  barcodeDetector
    .detect(imageData)
    .then((barcodes) => {
      barcodes.forEach((barcode) => console.log(barcode.rawValue));
    })
    .catch((err) => {
      console.log(err);
    });
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
      scanBarcode();
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
  //barcodeScan(framedata);

  setTimeout(requestAnimationFrame(extractFrame), 100);
}

const entrybutton = document.getElementById("entry");
const exitbutton = document.getElementById("exit");

active = "entry";

entrybutton.addEventListener("click", () => {
  entrybutton.className = "active";
  exitbutton.className = "notactive";
  active = "entry";
});

exitbutton.addEventListener("click", () => {
  entrybutton.className = "notactive";
  exitbutton.className = "active";
  active = "exit";
});

video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  requestAnimationFrame(extractFrame);
});
