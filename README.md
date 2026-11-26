# My Setup — 3D gear showcase

An interactive 3D desk (three.js) showing my peripherals. Click any item to zoom in and see its photo and specs.

## Edit your gear
Change only `gear.js`:
- `owner`: your name, GitHub username, tagline.
- `gear`: one entry per item. `type` picks the 3D model (keyboard, mouse, mousepad, headset, mic,
  monitor, pc, speakers, controller, webcam). Put photos in `img/` and set `image: "img/name.jpg"`.
- Delete an entry to remove that item from the desk.

Deep links work: `https://<username>.github.io/#keyboard` opens straight to the keyboard.

## Files
- `gear.js`: your gear (names, specs, photos, links). Edit this to change the cards.
- `models/<type>.js`: one 3D model per gear type (keyboard, mouse, mousepad, monitor, pc, mic, iem, controller, ...).
- `lib.js`: shared 3D helpers and textures. `main.js`: scene, desk layout (`slots`), camera, cards.
- `preview.html?model=pc&view=front`: dev page that shows one model beside its reference photos in `_refs/<type>/`
  (reference photos are local only and are not published, see .gitignore).

## Run locally
```
python -m http.server 8765
```
Open http://127.0.0.1:8765/

## Publish on GitHub Pages
1. Create a public repo named exactly `<username>.github.io`.
2. Push these files to its `main` branch.
3. In the repo, open Settings → Pages and set the source to "Deploy from a branch", `main`, `/ (root)`.
4. The site goes live at `https://<username>.github.io` within about a minute.
