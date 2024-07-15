use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptSave {
    pub(crate) name: String,
    pub(crate) script_args: Vec<String>,
    pub(crate) path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Script {
    pub(crate) visibility: String,
    pub(crate) arguments: String,
    pub(crate) path: String,
}
