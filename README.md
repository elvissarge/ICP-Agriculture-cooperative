# ICP-Agricultural-Cooperative-Platform
This ICP application in Typescript that aims to connect farmers to agricultural cooperatives in their communities. 
A decentralized platform for local farmers to collaborate, share resources, and collectively market their products.
Include features for group purchasing, shared equipment management, and a marketplace for agricultural produce.

### Prerequisites
### Setup local machine
To get this project up and running locally:
- [Installation Requirements for Internet Computer: Node.js 18, dfx, Rust](https://docs.google.com/document/d/1OW3oT8F9pumYg3hmybrHFB8T0VpDwDgRVE5PfVkHFJI/edit?usp=sharing)


To Run this App locally follow the following steps:
Step 1: Use the git clone command followed by the link to this repo.
```bash
  git clone https://github.com/elvissarge/ICP-Agriculture-cooperative.git
```

Step 2: cd to the app directory.
```bash
  cd ICP-Agriculture-cooperative
```

Step 3: Start a replica, which is a local instance of the IC that you can deploy your canisters to:
```bash
  dfx start --background --clean
```

Step 4: Install the Dependencies:
```bash
    npm install
```

Step 5: Now you can deploy your canister locally:
```bash
    dfx deploy
```
