use axum::{extract::Request, middleware::Next, response::Response};
use axum::http::header;
use uuid::Uuid;

#[derive(Clone)]
pub struct UserId(pub String);

pub async fn user_id_middleware(mut req: Request, next: Next) -> Response {
    let cookie_header = req
        .headers()
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let existing = cookie_header.split(';').find_map(|part| {
        let part = part.trim();
        part.strip_prefix("user_id=").map(|s| s.to_string())
    });

    let (user_id, is_new) = match existing {
        Some(id) if !id.is_empty() => (id, false),
        _ => (Uuid::new_v4().to_string(), true),
    };

    req.extensions_mut().insert(UserId(user_id.clone()));

    let mut response = next.run(req).await;

    if is_new {
        let cookie_value = format!(
            "user_id={}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000",
            user_id
        );
        if let Ok(val) = cookie_value.parse() {
            response.headers_mut().insert(header::SET_COOKIE, val);
        }
    }

    response
}
