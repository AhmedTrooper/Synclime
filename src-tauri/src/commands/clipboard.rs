use crate::AppEngineState;
use tauri::State;

#[derive(serde::Serialize)]
pub struct IngestionResult {
    pub success: bool,
    pub sanitized_url: String,
    pub message: String,
}

// this function cleans the link and deletes tracking things that spy on you
fn strip_tracking_parameters(target_url: &str) -> String {
    match url::Url::parse(target_url) {
        Ok(mut parsed_url) => {
            let clean_pairs: Vec<(String, String)> = parsed_url
                .query_pairs()
                .filter(|(key, _)| {
                    let k = key.to_lowercase();
                    k != "utm_source"
                        && k != "utm_medium"
                        && k != "utm_campaign"
                        && k != "utm_term"
                        && k != "utm_content"
                        && k != "si"
                        && k != "feature"
                })
                .map(|(k, v)| (k.into_owned(), v.into_owned()))
                .collect();

            parsed_url.set_query(None);
            if !clean_pairs.is_empty() {
                let mut serializer = parsed_url.query_pairs_mut();
                for (k, v) in clean_pairs {
                    serializer.append_pair(&k, &v);
                }
            }
            parsed_url.to_string()
        }
        Err(_) => target_url.to_string(),
    }
}

// this function checks if you pasted a real website link and fixes it
#[tauri::command]
pub async fn process_clipboard_paste(
    raw_input: String,
    _state: State<'_, AppEngineState>,
) -> Result<IngestionResult, String> {
    let trimmed = raw_input.trim();

    if trimmed.is_empty() {
        return Ok(IngestionResult {
            success: false,
            sanitized_url: "".to_string(),
            message: "Clipboard target data is completely empty.".to_string(),
        });
    }

    match url::Url::parse(trimmed) {
        Ok(_) => {
            let clean_url = strip_tracking_parameters(trimmed);
            Ok(IngestionResult {
                success: true,
                sanitized_url: clean_url,
                message: "Web address successfully validated and ingested.".to_string(),
            })
        }
        Err(_) => Ok(IngestionResult {
            success: false,
            sanitized_url: "".to_string(),
            message:
                "Provided text does not match valid web address protocols (e.g., missing https://)."
                    .to_string(),
        }),
    }
}
