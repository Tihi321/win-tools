use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct AudioText {
    pub(crate) text: String,
    pub(crate) name: String,
    pub(crate) voice: String,
}

#[derive(Serialize, Deserialize)]
pub struct AudioFile {
    pub(crate) file: String,
    pub(crate) name: String,
    pub(crate) voice: String,
}

#[derive(Serialize, Deserialize)]
pub struct AddFile {
    pub(crate) path: String,
}

#[derive(Serialize, Deserialize)]
pub struct RemoveFile {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) remove_from_disk: bool,
}
