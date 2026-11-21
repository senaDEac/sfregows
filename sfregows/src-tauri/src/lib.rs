#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            use serde::{Deserialize, Serialize};
            use std::collections::HashMap;
            use std::time::{Duration, Instant};
            use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

            const LABELS: [&str; 5] = ["main", "radio", "eq", "pl", "video"];
            const SETTLE: Duration = Duration::from_secs(3);

            #[derive(Serialize, Deserialize, Default, Clone, Copy, PartialEq)]
            struct Geom {
                x: i32,
                y: i32,
                w: u32,
                h: u32,
            }

            fn state_file<R: Runtime>(app: &AppHandle<R>) -> Option<std::path::PathBuf> {
                app.path()
                    .app_config_dir()
                    .ok()
                    .map(|d| d.join("sfregows-winstate.json"))
            }

            fn load<R: Runtime>(app: &AppHandle<R>) -> HashMap<String, Geom> {
                state_file(app)
                    .and_then(|p| std::fs::read_to_string(p).ok())
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default()
            }

            fn save<R: Runtime>(app: &AppHandle<R>, map: &HashMap<String, Geom>) {
                if let Some(p) = state_file(app) {
                    if let Ok(s) = serde_json::to_string(map) {
                        let _ = std::fs::write(p, s);
                    }
                }
            }

            fn apply<R: Runtime>(app: &AppHandle<R>, label: &str) {
                let Some(geom) = load(app).get(label).copied() else { return };
                let Some(win) = app.get_webview_window(label) else { return };
                let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: geom.w,
                    height: geom.h,
                }));
                let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: geom.x,
                    y: geom.y,
                }));
            }

            fn pos_matches<R: Runtime>(win: &WebviewWindow<R>, g: &Geom) -> bool {
                win.outer_position()
                    .map(|p| (p.x - g.x).abs() <= 6 && (p.y - g.y).abs() <= 6)
                    .unwrap_or(false)
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut was_visible: HashMap<String, bool> = HashMap::new();
                let mut visible_since: HashMap<String, Instant> = HashMap::new();
                let mut last_saved: HashMap<String, Geom> = HashMap::new();
                let mut applying: HashMap<String, Instant> = HashMap::new();

                loop {
                    for label in LABELS {
                        let Some(win) = handle.get_webview_window(label) else { continue };
                        let vis = win.is_visible().unwrap_or(false);
                        let lstr = label.to_string();

                        if !was_visible.get(&lstr).copied().unwrap_or(false) && vis {
                            visible_since.insert(lstr.clone(), Instant::now());
                            applying.insert(lstr.clone(), Instant::now());
                            let h = handle.clone();
                            let lbl = lstr.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(Duration::from_millis(700));
                                if let Some(g) = load(&h).get(&lbl).copied() {
                                    for attempt in 0..5 {
                                        if attempt > 0 {
                                            std::thread::sleep(Duration::from_millis(700));
                                        }
                                        apply(&h, &lbl);
                                        if let Some(w) = h.get_webview_window(&lbl) {
                                            if pos_matches(&w, &g) {
                                                break;
                                            }
                                        }
                                    }
                                }
                            });
                        } else if !vis {
                            visible_since.remove(&lstr);
                            was_visible.insert(lstr.clone(), false);
                            last_saved.remove(&lstr);
                            continue;
                        }
                        was_visible.insert(lstr.clone(), true);

                        // save settled geometry
                        if visible_since.get(&lstr).map(|t| t.elapsed() > SETTLE).unwrap_or(false)
                            && applying.get(&lstr).map(|t| t.elapsed() > Duration::from_secs(6)).unwrap_or(true)
                        {
                            if let (Ok(sz), Ok(pos)) = (win.inner_size(), win.outer_position()) {
                                let g = Geom { x: pos.x, y: pos.y, w: sz.width, h: sz.height };
                                if last_saved.get(&lstr) != Some(&g) {
                                    last_saved.insert(lstr.clone(), g);
                                    let mut map = load(&handle);
                                    map.insert(lstr.clone(), g);
                                    save(&handle, &map);
                                }
                            }
                        }
                    }
                    std::thread::sleep(Duration::from_millis(300));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
