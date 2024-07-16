use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ArgumentType {
    pub(crate) label: String,
    pub(crate) value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptSaveWindow {
    pub(crate) name: String,
    pub(crate) script_args: Vec<ArgumentType>,
    pub(crate) path: String,
    pub(crate) save: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptSave {
    pub(crate) name: String,
    pub(crate) script_args: Vec<ArgumentType>,
    pub(crate) path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptSaveLocal {
    pub(crate) name: String,
    pub(crate) script_args: Vec<ArgumentType>,
    pub(crate) path: String,
    pub(crate) local: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Script {
    pub(crate) visibility: String,
    pub(crate) arguments: String,
    pub(crate) path: String,
}
