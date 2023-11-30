import { $query, $update, Record, StableBTreeMap, Vec, match, Result, Principal, nat64, float64, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Farmer = Record<{
  id: string;
  name: string;
  phone: nat64;
  email: Opt<string>;
}>


type FarmerPayload = Record<{
  name: string;
  phone: nat64;
  email: Opt<string>;
}>

type Cooperative = Record<{
  coopID: string;
  coopName: string;
  publisher: string;
  address: string;
  members: Vec<Farmer>;
  products: Vec<string>;
  equipment: Vec<string>;
  description: string;
  ratings: Vec<Rating>;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>

type CooperativePayload = Record<{
    coopName: string;
    address: string;
    products: Vec<string>;
    equipment: Vec<string>;
    description: string;
}>

type Rating = Record<{
  id: string;
  owner: string;
  rate: number;
  updatedAt: nat64;
}>

type RatingPayload = Record<{
  rate: number;
}>

const cooperativeStorage = new StableBTreeMap<string, Cooperative>(0, 44, 1024);

/**
 * Get all Cooperatives
 */
$query;
export function getCooperatives(): Result<Vec<Cooperative>, string> {
  return Result.Ok(cooperativeStorage.values());
}

/**
 * Get Cooperative by id.
 */ 
$query;
export function getCooperative(coopID: string): Result<Cooperative, string> {
  return match(cooperativeStorage.get(coopID), {
    Some: (cooperative) => Result.Ok<Cooperative, string>(cooperative),
    None: () => Result.Err<Cooperative, string>(`Cooperative with id ${coopID} cannot be found.`)
  });
}

/**
 * Get all Cooperatives published by the caller
 */
$query;
export function getMyCooperatives(): Result<Vec<Cooperative>, string> {
    const myCooperatives = cooperativeStorage.values().filter((cooperative) => cooperative.publisher === ic.caller().toString());
    return Result.Ok<Vec<Cooperative>, string>(myCooperatives);
}

/**
 * Get all Cooperatives where the caller is a member
 */
$query;
export function getMyMembership(): Result<Vec<Cooperative>, string> {
    const memberCooperatives = cooperativeStorage.values().filter((cooperative) => {
        const farmers = cooperative.members || [];
        const isMember = farmers.some((farmer) => farmer.id === ic.caller().toString());
        return isMember;
    });
    return Result.Ok<Vec<Cooperative>, string>(memberCooperatives);
}

/**
 * Publish a new Cooperative
 */
$update
export function publishCooperative(payload: CooperativePayload): Result<Cooperative, string> {
  const cooperative: Cooperative = {
    coopID: uuidv4(),
    coopName: payload.coopName,
    publisher: ic.caller().toString(),
    address: payload.address,
    members: [],
    products: payload.products,
    equipment: payload.equipment,
    description: payload.description,
    ratings: [],
    createdAt: ic.time(),
    updatedAt: Opt.None,
  };
  cooperativeStorage.insert(cooperative.coopID, cooperative);
  return Result.Ok(cooperative);
}

/**
 * Update an existing Cooperative using Cooperative id
 */
$update;
export function updateCooperative(coopID: string, payload: CooperativePayload): Result<Cooperative, string> {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => {
          // Check if the caller is the publisher of the Cooperative.
          if (cooperative.publisher.toString() !== ic.caller().toString()){
            return Result.Err<Cooperative, string>(`You are not the publisher of the Cooperative with id ${coopID}.`);
          }
          const updatedCooperative: Cooperative = {...cooperative, ...payload, updatedAt: Opt.Some(ic.time())};
          cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
          return Result.Ok<Cooperative, string>(updatedCooperative);
        },
        None: () => Result.Err<Cooperative, string>(`couldn't update a cooperative with id=${coopID}. Cooperative not found`)
    });
}

/**
 * Delete Cooperative
 */
$update;
export function deleteCooperative(coopID: string): Result<Cooperative, string> {
    return match(cooperativeStorage.remove(coopID), {
        Some: (deletedCooperative) => {
          if (deletedCooperative.publisher.toString() !== ic.caller().toString()) {
            return Result.Err<Cooperative, string>(`You are not the publisher of the Coopeartive with id ${coopID}.`);
          }
          return Result.Ok<Cooperative, string>(deletedCooperative)
        },
        None: () => Result.Err<Cooperative, string>(`couldn't delete a cooperative with id=${coopID}. Cooperative not found.`)
    });
}

/**
 * Search for cooperatives by keyword
 */
$query;
export function searchCoops(keyword: string): Result<Vec<Cooperative>, string> {
  const _cooperatives = cooperativeStorage.values().filter((cooperative) => {
    // seerch keyword in cooperative's field
    const isMatched = cooperative.equipment.includes(keyword)
    || cooperative.products.includes(keyword)
    || cooperative.coopName.includes(keyword)
    || cooperative.address.includes(keyword)
    || cooperative.description.includes(keyword);
  return isMatched;
  });
  return Result.Ok<Vec<Cooperative>, string>(_cooperatives);
}

/**
 * Get all Cooperativess applied to by the caller(Farmer).
 */
$query;
export function getAppliedCooperativess(): Result<Vec<Cooperative>, string> {
    const myCooperatives = cooperativeStorage.values().filter((cooperative) => {
        const farmers = cooperative.members || [];
        const isFarmer = farmers.some((farmer) => farmer.id === ic.caller().toString());
        return isFarmer;
    });
    return Result.Ok<Vec<Cooperative>, string>(myCooperatives);
}

/**
 * caller(Farmer) aplying to cooperative
 */
$update;
export function applyCooperative(coopID: string, farmerPayload: FarmerPayload): Result<Cooperative, string> {
  return match(cooperativeStorage.get(coopID), {
    Some: (cooperative) => {
      const members = cooperative.members || [];

      //check if the caller is already in the cooperative
      if (members.length > 0) {
        const isMember = members.findIndex((farmer) => farmer.id.toString() === ic.caller().toString())>-1;
        if (isMember) {
          return Result.Err<Cooperative, string>(`You are already a member of the cooperative with id=${coopID}.`);
        }
      }
      const farmer: Farmer = {
        id: ic.caller.toString(),
        name: farmerPayload.name,
        phone: farmerPayload.phone,
        email: farmerPayload.email
    };
    members.push(farmer);

    const updatedCooperative: Cooperative = { ...cooperative, members, updatedAt: Opt.Some(ic.time()) };
    cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
    return Result.Ok<Cooperative, string>(updatedCooperative);
    },
    None: () => Result.Err<Cooperative, string>(`Could not apply to the Cooperative with id ${coopID}. Cooperative not found`)
  });
}

/**
 * cancel application to Cooperative
 */
$update;
export function cancelAppliedCooperative(coopID: string): Result<Cooperative, string> {
    return match(cooperativeStorage.get(coopID), {
        Some: (cooperative) => {
            const farmers = cooperative.members || [];
            // check if the caller has already applied to the cooperative
            if (farmers.length === 0) {
                return Result.Err<Cooperative, string>(`You have not applied the Cooperative with id=${coopID}.`);
            } else {
                const isFarmer = farmers.some((farmer) => farmer.id.toString() === ic.caller().toString());
                if (!isFarmer) {
                    return Result.Err<Cooperative, string>(`You have not applied the Cooperative with id=${coopID}.`);
                }
            }

            const updatedFarmers = farmers.filter((farmer) => farmer.id.toString() !== ic.caller().toString());
            const updatedCooperative: Cooperative = { ...cooperative, members: updatedFarmers, updatedAt: Opt.Some(ic.time()) };
            cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
            return Result.Ok<Cooperative, string>(updatedCooperative);
        },
        None: () => Result.Err<Cooperative, string>(`couldn't apply the cooperative with id=${coopID}. Cooperative not found`)
    });
}

/**
 * Caller rating Cooperative
 */
$update;
export function rateCooperative(coopID: string, ratingPayload: RatingPayload): Result<Cooperative, string> {
  return match(cooperativeStorage.get(coopID), {
    Some: (cooperative) => {
      const farmers = cooperative.members || [];
      const ratings = cooperative.ratings || [];

      //check if the caller is a member of the cooperative
      if (farmers.length > 0) {
        const isMember = farmers.findIndex((farmer) => farmer.id.toString() === ic.caller().toString())>-1;
        if (!isMember || (cooperative.publisher.toString() === ic.caller().toString()) ) {
          return Result.Err<Cooperative, string>(`Caller isn't a member of the Cooperative with id ${coopID}`);
        }
      }  
      const rating: Rating = {
        id: uuidv4(),
        owner: ic.caller().toString(),
        rate: ratingPayload.rate,
        updatedAt: ic.time()
      }

      if (ratingPayload.rate < 1 || ratingPayload.rate > 10) {
        return Result.Err<Cooperative, string>(`rating must be between 1 and 10`)
      }
      //update the rating 
      ratings.push(rating)

      const updatedRate: Cooperative = {...cooperative, ratings };
      cooperativeStorage.insert(cooperative.coopID, updatedRate);
      return Result.Ok<Cooperative, string>(updatedRate);
      
    },
    None: () => Result.Err<Cooperative, string>(`Couldn't update rating of Cooperative with id ${coopID}. Cooperative not found.`)
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
