// ============================================================
//  YOUR GEAR — edit this file only. Everything else reads it.
// ============================================================
//  type   : which 3D model to show. One of:
//           keyboard, mouse, mousepad, iem, headset, mic, monitor,
//           pc, speakers, controller, webcam
//  images : photos for the card: [{ src: "img/x.webp", credit: "Maker" }]. Empty = placeholder icon.
//  link   : product page, optional.
//  specs  : any label/value pairs you like, shown in the card.
// ============================================================

export const owner = {
  name: "Cmax",
  handle: "Cmax-cmd",          // GitHub username
  tagline: "My desk, piece by piece.",
};

export const gear = [
  {
    id: "monitor",
    type: "monitor",
    category: "Monitor",
    name: "ASUS ROG Strix OLED XG27ACDNG",
    specs: { Size: '26.5"', Panel: "QD-OLED", Resolution: "2560 × 1440", Refresh: "360 Hz", Response: "0.03 ms GtG", "HDR peak": "1000 nits" },
    note: "",
    images: [
      { src: "img/monitor.webp", credit: "ASUS ROG" },
    ],
    link: "https://rog.asus.com/monitors/27-to-31-5-inches/rog-strix-oled-xg27acdng/",
  },
  {
    id: "keyboard",
    type: "keyboard",
    category: "Keyboard",
    name: "SU75 Pro",
    specs: { Layout: "75% with RGB knob", Switches: "Hall effect (magnetic)", Lighting: "Per-key RGB" },
    note: "",
    images: [
      { src: "img/keyboard.jpg", credit: "my desk" },
    ],
    link: "",
  },
  {
    id: "mouse",
    type: "mouse",
    category: "Mouse",
    name: "WLmouse Beast X Pro",
    specs: { Weight: "39 g", Sensor: "PixArt PAW3950 HS", DPI: "up to 30,000", Polling: "up to 8000 Hz (wireless)", Shell: "Open-frame" },
    note: "",
    images: [
      { src: "img/mouse-official.webp", credit: "WLMOUSE" },
      { src: "img/mouse-official-2.webp", credit: "WLMOUSE" },
      { src: "img/mouse.jpg", credit: "my desk" },
    ],
    link: "https://www.wlmouse.com/products/x-pro",
  },
  {
    id: "mousepad",
    type: "mousepad",
    category: "Mousepad",
    name: "Artisan FX Type-99 (L)",
    size: [0.42, 0.33],
    logo: "FX TYPE-99",
    specs: { Size: "420 × 330 mm", Thickness: "~4 mm", "Made in": "Japan" },
    note: "",
    images: [
      { src: "img/mousepad.webp", credit: "ARTISAN" },
    ],
    link: "https://artisan-jp.com/jp/products/ninja-fx/fx-type99",
  },
  {
    id: "iem",
    type: "iem",
    category: "IEMs",
    name: "TRUTHEAR x Crinacle ZERO:RED",
    plugged: true, // cable runs to the monitor headphone jack
    specs: { Drivers: "Dual dynamic (10 mm + 7.8 mm)", Impedance: "17.5 Ω", Connector: "0.78 mm 2-pin", Plug: "3.5 mm" },
    note: "",
    images: [
      { src: "img/iem.webp", credit: "TRUTHEAR" },
    ],
    link: "https://truthear.com/products/zero-red",
  },
  {
    id: "mic",
    type: "mic",
    category: "Microphone",
    name: "FIFINE AmpliGame AM8 + boom arm",
    specs: { Type: "Dynamic", Pattern: "Cardioid", Outputs: "USB-C + XLR", Response: "50 Hz – 16 kHz", Lighting: "RGB" },
    note: "",
    images: [
      { src: "img/mic-official.webp", credit: "FIFINE" },
      { src: "img/mic.jpg", credit: "my desk" },
    ],
    link: "https://fifinemicrophone.com/collections/all-fifine-products-1/products/fifine-am8-microphone-official",
  },
  {
    id: "pc",
    type: "pc",
    category: "PC",
    name: "All-white Ryzen 7800X3D build",
    specs: {
      CPU: "AMD Ryzen 7 7800X3D",
      GPU: "PowerColor Red Devil Spectral White RX 9070 XT",
      Motherboard: "Gigabyte X870E AORUS PRO X3D ICE",
      RAM: "32 GB DDR5 Corsair Dominator Platinum RGB",
      Cooler: "Lian Li HydroShift II LCD-S (white)",
      Case: "be quiet! Light Base 600 LX (white)",
      Cables: "Lian Li Strimer",
    },
    note: "",
    images: [
      { src: "img/pc.jpg", credit: "my desk" },
      { src: "img/case.webp", credit: "be quiet!" },
      { src: "img/gpu.webp", credit: "PowerColor" },
      { src: "img/gpu-2.webp", credit: "PowerColor" },
      { src: "img/aio.webp", credit: "Lian Li" },
      { src: "img/motherboard.webp", credit: "GIGABYTE" },
      { src: "img/cpu.webp", credit: "AMD" },
      { src: "img/ram.webp", credit: "CORSAIR" },
    ],
    link: "https://www.bequiet.com/en/case/5295",
  },
  {
    id: "controller",
    type: "controller",
    category: "Controller",
    name: "Sony DualSense",
    specs: { Color: "Black", Features: "Haptics, adaptive triggers", Connection: "USB-C / Bluetooth" },
    note: "",
    images: [
      { src: "img/controller.webp", credit: "Sony Interactive Entertainment" },
    ],
    link: "https://www.playstation.com/en-us/accessories/dualsense-wireless-controller/",
  },
];
