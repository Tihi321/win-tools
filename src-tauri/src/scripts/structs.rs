use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptWindow {
    pub(crate) name: String,
    pub(crate) visibility: String,
    pub(crate) arguments: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Script {
    pub(crate) name: String,
    pub(crate) visibility: String,
    pub(crate) arguments: String,
    pub(crate) path: String,
}
