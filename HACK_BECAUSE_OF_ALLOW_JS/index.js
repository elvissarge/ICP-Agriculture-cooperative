import { $query, $update, StableBTreeMap, match, Result, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';
const cooperativeStorage = new StableBTreeMap(0, 44, 1024);
/**
 * Get all Cooperatives
 */
$query;
export function getCooperatives() {
    return Result.Ok(cooperativeStorage.values());
}
/**
 * Get Cooperative by id.
 */
$query;
export function getCooperative(coopID) {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => Result.Ok(cooperative),
        None: () => Result.Err(`Cooperative with id ${coopID} cannot be found.`)
    });
}
/**
 * Get all Cooperatives published by the caller
 */
$query;
export function getMyCooperatives() {
    const myCooperatives = cooperativeStorage.values().filter((cooperative) => cooperative.publisher === ic.caller().toString());
    return Result.Ok(myCooperatives);
}
/**
 * Get all Cooperatives where the caller is a member
 */
$query;
export function getMyMembership() {
    const memberCooperatives = cooperativeStorage.values().filter((cooperative) => {
        const farmers = cooperative.members || [];
        const isMember = farmers.some((farmer) => farmer.id === ic.caller().toString());
        return isMember;
    });
    return Result.Ok(memberCooperatives);
}
/**
 * Publish a new Cooperative
 */
$update;
export function publishCooperative(payload) {
    const cooperative = {
        coopID: uuidv4(),
        coopName: payload.coopName,
        publisher: ic.caller().toString(),
        address: payload.address,
        members: [],
        products: payload.products,
        equipment: payload.equipment,
        description: payload.description,
        rating: [],
        createdAt: ic.time(),
        updatedAt: Opt.None,
    };
    cooperativeStorage.insert(cooperative.id, cooperative);
    return Result.Ok(cooperative);
}
/**
 * Update an existing Cooperative using Cooperative id
 */
$update;
export function updateCooperative(coopID, payload) {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => {
            // Check if the caller is the publisher of the Cooperative.
            if (cooperative.publisher.toString() !== ic.caller().toString()) {
                return Result.Err(`You are not the publisher of the Cooperative with id ${coopID}.`);
            }
            const updatedCooperative = { ...cooperative, ...payload, updatedAt: Opt.Some(ic.time()) };
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return Result.Ok(updatedCooperative);
        },
        None: () => Result.Err(`couldn't update a cooperative with id=${coopID}. Cooperative not found`)
    });
}
/**
 * Delete Cooperative
 */
$update;
export function deleteCooperative(coopID) {
    return match(cooperativeStorage.remove(coopID), {
        Some: (deletedCooperative) => {
            if (deletedCooperative.publisher.toString() !== ic.caller().toString()) {
                return Result.Err(`You are not the publisher of the Coopeartive with id ${coopID}.`);
            }
            return Result.Ok(deletedCooperative);
        },
        None: () => Result.Err(`couldn't delete a cooperative with id=${coopID}. Cooperative not found.`)
    });
}
/**
 * Search for cooperatives by keyword
 */
$query;
export function searchCoops(keyword) {
    const _cooperatives = cooperativeStorage.values().filter((cooperative) => {
        // seerch keyword in cooperative's field
        const isMatched = cooperative.position.includes(keyword)
            || cooperative.products.includes(keyword)
            || cooperative.coopName.includes(keyword)
            || cooperative.address.includes(keyword)
            || cooperative.description.includes(keyword);
        return isMatched;
    });
    return Result.Ok(_cooperatives);
}
/**
 * Get all Cooperativess applied to by the caller(Farmer).
 */
$query;
export function getAppliedCooperativess() {
    const myCooperatives = cooperativeStorage.values().filter((cooperative) => {
        const farmers = cooperative.farmers || [];
        const isFarmer = farmers.some((farmer) => farmer.id === ic.caller().toString());
        return isFarmer;
    });
    return Result.Ok(myCooperatives);
}
/**
 * caller(Farmer) aplying to cooperative
 */
$update;
export function applyCooperative(coopID, farmerPayload) {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => {
            const farmers = cooperative.members || [];
            //check if the caller is already in the cooperative
            if (farmers.length > 0) {
                const isFarmer = farmers.findIndex((farmer) => farmer.id.toString() === ic.caller().toString()) > -1;
                if (isFarmer) {
                    return Result.Err(`You are already a member of the cooperative with id=${coopID}.`);
                }
            }
            const farmer = {
                id: ic.caller.toString(),
                name: farmerPayload.name,
                phone: farmerPayload.phone,
                email: farmerPayload.email,
                applyAt: ic.time()
            };
            farmers.push(farmer);
            const updatedCooperative = { ...cooperative, farmers, updatedAt: Opt.Some(ic.time()) };
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return Result.Ok(updatedCooperative);
        },
        None: () => Result.Err(`Could not apply to the Cooperative with id ${coopID}. Cooperative not found`)
    });
}
/**
 * cancel application to Cooperative
 */
$update;
export function cancelAppliedCooperative(coopID) {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => {
            const farmers = cooperative.farmers || [];
            // check if the caller has already applied to the cooperative
            if (farmers.length === 0) {
                return Result.Err(`You have not applied the Cooperative with id=${coopID}.`);
            }
            else {
                const isFarmer = farmers.some((farmer) => farmer.id.toString() === ic.caller().toString());
                if (!isFarmer) {
                    return Result.Err(`You have not applied the Cooperative with id=${coopID}.`);
                }
            }
            const updatedFarmers = farmers.filter((farmer) => farmer.id.toString() !== ic.caller().toString());
            const updatedCooperative = { ...cooperative, farmers: updatedFarmers, updatedAt: Opt.Some(ic.time()) };
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return Result.Ok(updatedCooperative);
        },
        None: () => Result.Err(`couldn't apply the cooperative with id=${coopID}. Cooperative not found`)
    });
}
/**
 * Caller rating Cooperative
 */
$update;
export function rateCooperative(coopID, ratingPayload) {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => {
            const farmers = cooperative.members || [];
            const ratings = cooperative.ratings || [];
            //check if the caller is a member of the cooperative
            if (farmers.length > 0) {
                const isMember = farmers.findIndex((farmer) => farmer.id.toString() === ic.caller().toString()) > -1;
                if (!isMember || (cooperative.publisher.toString() === ic.caller().toString())) {
                    return Result.Err(`Caller isn't a member of the Cooperative with id ${coopID}`);
                }
            }
            const rating = {
                id: uuidv4(),
                owner: ic.caller().toString(),
                rate: ratingPayload.rating,
                updatedAt: ic.time()
            };
            if (ratingPayload.rate < 1 || ratingPayload > 10) {
                return Result.Err(`rating must be between 1 and 10`);
            }
            //update the rating 
            ratings.push(rating);
            const updatedRate = { ...cooperative, rating };
            cooperativeStorage.insert(cooperative.coopID, updatedRate);
            return Result.Ok(updatedRate);
        },
        None: () => Result.Err(`Couldn't update rating of Cooperative with id ${coopID}. Cooperative not found.`)
    });
}
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};
