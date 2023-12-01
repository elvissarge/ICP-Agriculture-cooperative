// Import necessary modules and libraries
import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  Principal,
  nat64,
  float64,
  ic,
  Opt,
} from 'azle';
import { v4 as uuidv4 } from 'uuid';

// Define the Farmer record type
type Farmer = Record<{
  id: string;
  owner: Principal;
  name: string;
  phone: nat64;
  email: Opt<string>;
}>;

// Define the Farmer payload type
type FarmerPayload = Record<{
  name: string;
  phone: nat64;
  email: Opt<string>;
}>;

// Define the Cooperative record type
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
}>;

// Define the Cooperative payload type
type CooperativePayload = Record<{
  coopName: string;
  address: string;
  products: Vec<string>;
  equipment: Vec<string>;
  description: string;
}>;

// Define the Rating record type
type Rating = Record<{
  id: string;
  owner: string;
  rate: number;
  updatedAt: nat64;
}>;

// Define the Rating payload type
type RatingPayload = Record<{
  rate: number;
}>;

// Create a storage mechanism for Cooperatives
const cooperativeStorage = new StableBTreeMap<string, Cooperative>(0, 44, 1024);

/**
* Get all Cooperatives
*/
$query;
export function getCooperatives(): Result<Vec<Cooperative>, string> {
  try {
    // Retrieve all cooperatives from storage
    const cooperatives = cooperativeStorage.values();
    return Result.Ok(cooperatives);
  } catch (error) {
    // Handle errors during retrieval
    return Result.Err(`Error getting cooperatives: ${error}`);
  }
}

/**
* Get Cooperative by id.
*/
$query;
export function getCooperative(coopID: string): Result<Cooperative, string> {
  try {
    // Validate ID format
    if (!coopID) {
      return Result.Err(`Invalid ID format for Cooperative: ${coopID}`);
    }

    // Retrieve the cooperative by ID
    return match(cooperativeStorage.get(coopID), {
      Some: (cooperative) => Result.Ok<Cooperative, string>(cooperative),
      None: () => Result.Err<Cooperative, string>(`Cooperative with id ${coopID} cannot be found.`)
    });
  } catch (error) {
    // Handle errors during retrieval
    return Result.Err(`Error getting cooperative by id: ${error}`);
  }
}

/**
* Get all Cooperatives published by the caller
*/
$query;
export function getMyCooperatives(): Result<Vec<Cooperative>, string> {
  try {
    // Get the caller's ID
    const callerID = ic.caller().toString();

    // Validate caller's ID format
    if (!callerID) {
      return Result.Err(`Invalid ID format for Caller: ${callerID}`);
    }

    // Filter cooperatives published by the caller
    const myCooperatives = cooperativeStorage.values().filter((cooperative) => cooperative.publisher === callerID);

    return Result.Ok(myCooperatives);
  } catch (error) {
    // Handle errors during retrieval
    return Result.Err(`Error getting caller's cooperatives: ${error}`);
  }
}

/**
* Get all Cooperatives where the caller is a member
*/
$query;
export function getMyMembership(): Result<Vec<Cooperative>, string> {
  try {
    // Get the caller's ID
    const callerID = ic.caller().toString();

    // Validate caller's ID format
    if (!callerID) {
      return Result.Err(`Invalid ID format for Caller: ${callerID}`);
    }

    // Filter cooperatives where the caller is a member
    const memberCooperatives = cooperativeStorage.values().filter((cooperative) => {
      const farmers = cooperative.members || [];
      const isMember = farmers.some((farmer) => farmer.owner.toString() === callerID);
      return isMember;
    });

    return Result.Ok(memberCooperatives);
  } catch (error) {
    // Handle errors during retrieval
    return Result.Err(`Error getting caller's memberships: ${error}`);
  }
}

/**
* Publish a new Cooperative
*/
$update;
export function publishCooperative(payload: CooperativePayload): Result<Cooperative, string> {
  try {
    // Validate payload format
    if (!payload.coopName || !payload.address || !payload.description ) {
      return Result.Err(`Invalid payload format for publishing Cooperative.`);
    }

    // Get the caller's ID
    const callerID = ic.caller().toString();

    // Validate caller's ID format
    if (!callerID) {
      return Result.Err(`Invalid ID format for Caller: ${callerID}`);
    }

    // Create a new Cooperative with generated ID and caller as the publisher
    const cooperative: Cooperative = {
      coopID: uuidv4(),
      coopName: payload.coopName,
      publisher: callerID,
      address: payload.address,
      members: [],
      products: payload.products,
      equipment: payload.equipment,
      description: payload.description,
      ratings: [],
      createdAt: ic.time(),
      updatedAt: Opt.None,
    };

    // Insert the new Cooperative into storage
    cooperativeStorage.insert(cooperative.coopID, cooperative);
    return Result.Ok(cooperative);
  } catch (error) {
    // Handle errors during publishing
    return Result.Err(`Error publishing cooperative: ${error}`);
  }
}

/**
* Update an existing Cooperative using Cooperative id
*/
$update;
export function updateCooperative(coopID: string, payload: CooperativePayload): Result<Cooperative, string> {
  try {
    // Validate ID format
    if (!coopID) {
      return Result.Err(`Invalid ID format for Cooperative: ${coopID}`);
    }

    // Validate payload format
    if (!payload.coopName || !payload.address || !payload.description) {
      return Result.Err(`Invalid payload format for publishing Cooperative.`);
    }
    // Retrieve the existing cooperative by ID
    return match(cooperativeStorage.get(coopID), {
      Some: (cooperative) => {
        // Check if the caller is the publisher of the Cooperative.
        if (cooperative.publisher.toString() !== ic.caller().toString()) {
          return Result.Err<Cooperative, string>(`You are not the publisher of the Cooperative with id ${coopID}.`);
        }
        const updatedCooperative: Cooperative = { ...cooperative, ...payload, updatedAt: Opt.Some(ic.time()) };
        cooperativeStorage.insert(cooperative.coopID, updatedCooperative);
        return Result.Ok<Cooperative, string>(updatedCooperative);
      },
      None: () => Result.Err<Cooperative, string>(`couldn't update a cooperative with id=${coopID}. Cooperative not found`)
    });
  } catch (error) {
    // Handle errors during updating
    return Result.Err(`Error updating cooperative: ${error}`);
  }
}

/**
* Delete Cooperative
*/
$update;
export function deleteCooperative(coopID: string): Result<Cooperative, string> {
  try {
    // Validate ID format
    if (!coopID) {
      return Result.Err(`Invalid ID format for Cooperative: ${coopID}`);
    }

    // Remove the cooperative from storage
    return match(cooperativeStorage.remove(coopID), {
      Some: (deletedCooperative) => {
        if (deletedCooperative.publisher.toString() !== ic.caller().toString()) {
          return Result.Err<Cooperative, string>(`You are not the publisher of the Coopeartive with id ${coopID}.`);
        }
        return Result.Ok<Cooperative, string>(deletedCooperative)
      },
      None: () => Result.Err<Cooperative, string>(`couldn't delete a cooperative with id=${coopID}. Cooperative not found.`)
    });
  } catch (error) {
    // Handle errors during deletion
    return Result.Err(`Error deleting cooperative: ${error}`);
  }
}

/**
* Search for cooperatives by keyword
*/
$query;
export function searchCoops(keyword: string): Result<Vec<Cooperative>, string> {
  try {
    // Filter cooperatives based on the keyword in various fields
    const _cooperatives = cooperativeStorage.values().filter((cooperative) => {
      const isMatched =
        cooperative.equipment.includes(keyword) ||
        cooperative.products.includes(keyword) ||
        cooperative.coopName.includes(keyword) ||
        cooperative.address.includes(keyword) ||
        cooperative.description.includes(keyword);

      return isMatched;
    });

    return Result.Ok(_cooperatives);
  } catch (error) {
    // Handle errors during search
    return Result.Err(`Error searching for cooperatives: ${error}`);
  }
}

/**
* Get all Cooperatives applied to by the caller (Farmer).
*/
$query;
export function getAppliedCooperatives(): Result<Vec<Cooperative>, string> {
  try {
    // Get the caller's ID
    const callerID = ic.caller().toString();

    // Validate caller's ID format
    if (!callerID) {
      return Result.Err(`Invalid ID format for Caller: ${callerID}`);
    }

    // Filter cooperatives where the caller is a member
    const myCooperatives = cooperativeStorage.values().filter((cooperative) => {
      const farmers = cooperative.members || [];
      const isFarmer = farmers.some((farmer) => farmer.id === callerID);
      return isFarmer;
    });

    return Result.Ok(myCooperatives);
  } catch (error) {
    // Handle errors during retrieval
    return Result.Err(`Error getting applied cooperatives: ${error}`);
  }
}

/**
* Caller (Farmer) applying to cooperative
*/
$update;
export function applyCooperative(coopID: string, farmerPayload: FarmerPayload): Result<Cooperative, string> {
  try {
    // Validate ID format
    if (!coopID) {
      return Result.Err(`Invalid ID format for Cooperative: ${coopID}`);
    }
    // Validate payload format
    if (!farmerPayload.name || !farmerPayload.email || !farmerPayload.phone) {
      return Result.Err(`Invalid payload format for applying Cooperative.`);
    }


    // Retrieve the cooperative by ID
    return match(cooperativeStorage.get(coopID), {
      Some: (cooperative) => {
        const members = cooperative.members || [];

        //check if the caller is already in the cooperative
        if (members.length > 0) {
          const isMember = members.findIndex((farmer) => farmer.id.toString() === ic.caller().toString()) > -1;
          if (isMember) {
            return Result.Err<Cooperative, string>(`You are already a member of the cooperative with id=${coopID}.`);
          }
        }
        const farmer: Farmer = {
          id: uuidv4(),
          owner : ic.caller(),
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

  } catch (error) {
    // Handle errors during application
    return Result.Err(`Error applying to cooperative: ${error}`);
  }
}

/**
* Cancel application to Cooperative
*/
$update;
export function cancelAppliedCooperative(coopID: string): Result<Cooperative, string> {
  
    // Validate ID format
    if (!coopID) {
      return Result.Err(`Invalid ID format for Cooperative: ${coopID}`);
    }

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
  };

/**
 * Caller rating Cooperative
 */
$update;
export function rateCooperative(coopID: string, ratingPayload: RatingPayload): Result<Cooperative, string> {
   // Validate ID format
   if (!coopID) {
    return Result.Err(`Invalid ID format for Cooperative: ${coopID}`);
  }

  // Validate RatingPayload format
  if (ratingPayload.rate < 1 || ratingPayload.rate > 10) {
    return Result.Err<Cooperative, string>(`rating must be between 1 and 10`)
  }

  return match(cooperativeStorage.get(coopID), {
    Some: (cooperative) => {
      
      const ratings = cooperative.ratings || [];

        
      const rating: Rating = {
        id: uuidv4(),
        owner: ic.caller().toString(),
        rate: ratingPayload.rate,
        updatedAt: ic.time()
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
