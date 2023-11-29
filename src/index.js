"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateCooperative = exports.cancelAppliedCooperative = exports.applyCooperative = exports.getAppliedCooperativess = exports.searchCoops = exports.deleteCooperative = exports.updateCooperative = exports.publishCooperative = exports.getCooperative = exports.getCooperatives = void 0;
var azle_1 = require("azle");
var uuid_1 = require("uuid");
var cooperativeStorage = new azle_1.StableBTreeMap(0, 44, 1024);
/**
 * Get all Cooperatives
 */
azle_1.$query;
function getCooperatives() {
    return azle_1.Result.Ok(cooperativeStorage.values());
}
exports.getCooperatives = getCooperatives;
/**
 * Get Cooperative by id.
 */
azle_1.$query;
function getCooperative(coopID) {
    return (0, azle_1.match)(cooperativeStorage.get(coopID), {
        Some: function (cooperative) { return azle_1.Result.Ok(cooperative); },
        None: function () { return azle_1.Result.Err("Cooperative with id ".concat(coopID, " cannot be found.")); }
    });
}
exports.getCooperative = getCooperative;
/**
 * Publish a new Cooperative
 */
azle_1.$update;
function publishCooperative(payload) {
    var cooperative = {
        coopID: (0, uuid_1.v4)(),
        coopName: payload.coopName,
        publisher: azle_1.ic.caller().toString(),
        address: payload.address,
        members: [],
        products: payload.products,
        equipment: payload.equipment,
        description: payload.description,
        createdAt: azle_1.ic.time(),
        updatedAt: azle_1.Opt.None,
    };
    cooperativeStorage.insert(cooperative.id, cooperative);
    return azle_1.Result.Ok(cooperative);
}
exports.publishCooperative = publishCooperative;
/**
 * Update an existing Cooperative using Cooperative id
 */
azle_1.$update;
function updateCooperative(coopID, payload) {
    return (0, azle_1.match)(cooperativeStorage.get(coopID), {
        Some: function (cooperative) {
            // Check if the caller is the publisher of the Cooperative.
            if (cooperative.publisher.toString() !== azle_1.ic.caller().toString()) {
                return azle_1.Result.Err("You are not the publisher of the Cooperative with id ".concat(coopID, "."));
            }
            var updatedCooperative = __assign(__assign(__assign({}, cooperative), payload), { updatedAt: azle_1.Opt.Some(azle_1.ic.time()) });
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return azle_1.Result.Ok(updatedCooperative);
        },
        None: function () { return azle_1.Result.Err("couldn't update a cooperative with id=".concat(coopID, ". Cooperative not found")); }
    });
}
exports.updateCooperative = updateCooperative;
/**
 * Delete Cooperative
 */
azle_1.$update;
function deleteCooperative(coopID) {
    return (0, azle_1.match)(cooperativeStorage.remove(coopID), {
        Some: function (deletedCooperative) {
            if (deletedCooperative.publisher.toString() !== azle_1.ic.caller().toString()) {
                return azle_1.Result.Err("You are not the publisher of the Coopeartive with id ".concat(coopID, "."));
            }
            return azle_1.Result.Ok(deletedCooperative);
        },
        None: function () { return azle_1.Result.Err("couldn't delete a cooperative with id=".concat(coopID, ". Cooperative not found.")); }
    });
}
exports.deleteCooperative = deleteCooperative;
/**
 * Search for cooperatives by keyword
 */
azle_1.$query;
function searchCoops(keyword) {
    var _cooperatives = cooperativeStorage.values().filter(function (cooperative) {
        // seerch keyword in cooperative's field
        var isMatched = cooperative.position.includes(keyword)
            || cooperative.products.includes(keyword)
            || cooperative.coopName.includes(keyword)
            || cooperative.address.includes(keyword)
            || cooperative.description.includes(keyword);
        return isMatched;
    });
    return azle_1.Result.Ok(_cooperatives);
}
exports.searchCoops = searchCoops;
/**
 * Get all Cooperativess applied to by the caller(Farmer).
 */
azle_1.$query;
function getAppliedCooperativess() {
    var myCooperatives = cooperativeStorage.values().filter(function (cooperative) {
        var farmers = cooperative.farmers || [];
        var isFarmer = farmers.some(function (farmer) { return farmer.id === azle_1.ic.caller().toString(); });
        return isFarmer;
    });
    return azle_1.Result.Ok(myCooperatives);
}
exports.getAppliedCooperativess = getAppliedCooperativess;
/**
 * caller(Farmer) aplying to cooperative
 */
azle_1.$update;
function applyCooperative(coopID, farmerPayload) {
    return (0, azle_1.match)(cooperativeStorage.get(coopID), {
        Some: function (cooperative) {
            var farmers = cooperative.members || [];
            //check if the caller is already in the cooperative
            if (farmers.length > 0) {
                var isFarmer = farmers.findIndex(function (farmer) { return farmer.id.toString() === azle_1.ic.caller().toString(); }) > -1;
                if (isFarmer) {
                    return azle_1.Result.Err("You are already a member of the cooperative with id=".concat(coopID, "."));
                }
            }
            var farmer = {
                id: azle_1.ic.caller.toString(),
                name: farmerPayload.name,
                phone: farmerPayload.phone,
                email: farmerPayload.email,
                applyAt: azle_1.ic.time()
            };
            farmers.push(farmer);
            var updatedCooperative = __assign(__assign({}, cooperative), { farmers: farmers, updatedAt: azle_1.Opt.Some(azle_1.ic.time()) });
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return azle_1.Result.Ok(updatedCooperative);
        },
        None: function () { return azle_1.Result.Err("Could not apply to the Cooperative with id ".concat(coopID, ". Cooperative not found")); }
    });
}
exports.applyCooperative = applyCooperative;
/**
 * cancel application to Cooperative
 */
azle_1.$update;
function cancelAppliedCooperative(coopID) {
    return (0, azle_1.match)(cooperativeStorage.get(coopID), {
        Some: function (cooperative) {
            var farmers = cooperative.farmers || [];
            // check if the caller has already applied to the cooperative
            if (farmers.length === 0) {
                return azle_1.Result.Err("You have not applied the Cooperative with id=".concat(coopID, "."));
            }
            else {
                var isFarmer = farmers.some(function (farmer) { return farmer.id.toString() === azle_1.ic.caller().toString(); });
                if (!isFarmer) {
                    return azle_1.Result.Err("You have not applied the Cooperative with id=".concat(coopID, "."));
                }
            }
            var updatedFarmers = farmers.filter(function (farmer) { return farmer.id.toString() !== azle_1.ic.caller().toString(); });
            var updatedCooperative = __assign(__assign({}, cooperative), { farmers: updatedFarmers, updatedAt: azle_1.Opt.Some(azle_1.ic.time()) });
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return azle_1.Result.Ok(updatedCooperative);
        },
        None: function () { return azle_1.Result.Err("couldn't apply the cooperative with id=".concat(coopID, ". Cooperative not found")); }
    });
}
exports.cancelAppliedCooperative = cancelAppliedCooperative;
/**
 * Caller rating Cooperative
 */
azle_1.$update;
function rateCooperative(coopID, rating) {
    return (0, azle_1.match)(cooperativeStorage.get(coopID), {
        Some: function (cooperative) {
            var farmers = cooperative.members || [];
            //check if the caller is a member of the cooperative
            if (farmers.length > 0) {
                var isMember = farmers.findIndex(function (farmer) { return farmer.id.toString() === azle_1.ic.caller().toString(); }) > -1;
                if (!isMember || (cooperative.publisher.toString() === azle_1.ic.caller().toString())) {
                    return azle_1.Result.Err("Caller isn't a member of the Cooperative with id ".concat(coopID));
                }
                if (rating < 1 || rating > 10) {
                    return azle_1.Result.Err("rating must be between 1 and 10");
                }
            }
            var updatedRate = __assign(__assign({}, cooperative), { updatedAt: azle_1.Opt.Some(azle_1.ic.time()) });
            //update the rating by increasing it with the current input
            updatedRate.rating += rating;
            cooperativeStorage.insert(cooperative.coopID, updatedRate);
            return azle_1.Result.Ok(updatedRate);
        },
        None: function () { return azle_1.Result.Err("Couldn't update rating of Cooperative with id ".concat(coopID, ". Cooperative not found.")); }
    });
}
exports.rateCooperative = rateCooperative;
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: function () {
        var array = new Uint8Array(32);
        for (var i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};
