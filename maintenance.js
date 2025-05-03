
let maintenanceMode = false

async function UpdateMaintenance(change) {
    try {
      maintenanceMode = change;
      console.log(maintenanceMode)
    } catch {
  
    }
  }
  

  module.exports = {

    maintenanceMode,
    UpdateMaintenance
  }