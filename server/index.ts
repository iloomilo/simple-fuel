import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { FuelConfig } from './shared/config.js';

let activeVehicles = new Set();
const Rebar = useRebar();
const SyncBinder = Rebar.systems.useStreamSyncedBinder();
const fuelSessionKey = 'fuel-counter';

declare module 'alt-server' {
    export interface ICustomVehicleMeta {
        'fuel-counter'?: number;
    }
}

// To sync in Hud
SyncBinder.syncVehicleKey('fuel');

//To only iterate through active vehicles
alt.on('vehicle:motor-state-change', (veh: alt.Vehicle) => {
    if (veh.valid && veh.engineOn) {
        activeVehicles.add(veh);
    } else {
        activeVehicles.delete(veh);
    }
});

//Set fuelCounter at vehicleBound
alt.on('rebar:vehicleBound', (veh: alt.Vehicle) => veh.setMeta(fuelSessionKey, 0));

setInterval(() => {
    activeVehicles.forEach((veh: alt.Vehicle) => {
        let vehDoc = Rebar.document.vehicle.useVehicle(veh);
        let fuel = vehDoc.getField('fuel');
        let fuelCounter = veh.getMeta(fuelSessionKey);
        // Turn engine off, if fuel is empty
        if (fuel <= 0) {
            veh.engineOn = false;
            activeVehicles.delete(veh);
            return;
        }
        //  add interval seconds to fuelCounter
        veh.setMeta(fuelSessionKey, (fuelCounter += FuelConfig.checkInterval));
        // subtract one fuel unit, if fuelCounter reached limit
        if (fuelCounter >= FuelConfig.fuelInterval && veh.engineOn) {
            fuel -= 1;
            vehDoc.set('fuel', fuel);
            veh.setMeta(fuelSessionKey, 0);
        }
    });
}, FuelConfig.checkInterval * 1000);
