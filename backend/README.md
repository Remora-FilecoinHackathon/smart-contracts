# Backend Setup
The backend uses a container image hosted in Amazon ECS for the contract event listener, and a script in AWS Lambda for checking the reputation of the address sent from the contract event listener. 

## Container Setup
The steps below are performed to build the container image, using `node:16.17` as a base image:
1. Copy the hardhat setup from local (could also git clone but more work with SSH key setup)
2. Run an `npm i` inside hardhat repo
3. Load a private key into the ECS image, could just be an AWS Secrets Manger call to create a `.env` file in the container 
4. Run the event listener script as the entrypoint 


## Conversion problem 
What do I need to be able to do for reputation?
1. Receive a BLS address or miner ID in the CheckReputation call, which will be in a bytes format instead of string
- Regular FIL addresses convert correctly to bytes
- BLS FIL addresses used for miners do not correctly map to bytes, they come back too long
2. Use its converted bytes value to 


## Fixes
1. Use bytes address to find FIL address, then miner ID, using a third party system
- The bytes conversion for BLS addresses is incorrect, and Filfox cannot find them - the bytes address is too long 