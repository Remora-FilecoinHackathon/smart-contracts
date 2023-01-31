# Backend Setup
The backend uses a container image hosted in Amazon ECS for the contract event listener, and a script in AWS Lambda for checking the reputation of the address sent from the contract event listener. 

## Container Setup
The steps below are performed to build the container image, using `node:16.17` as a base image:
1. Copy the hardhat setup from local (could also git clone but more work with SSH key setup)
2. Run an `npm i` inside hardhat repo
3. Load a private key into the ECS image, could just be an AWS Secrets Manger call to create a `.env` file in the container. Currently grabbing local .env and using keys from there
4. Run the event listener script as the entrypoint 
- Event listener sends SQS message to queue to be picked up by Lambda for the web scraping piece

## Lambda Setup
The Lambda function is triggered by an SQS message arriving to the queue. The function takes the message from SQS and sends it to the FilRep API to query for its reputation. It then makes a decision about whether or not that miner is reputable enough to allow a loan, and writes the miner ID, along with its good or bad value,  to the `LenderManager` contract. 


## Current status: 
- Remora Docker image is pushed to ECR
- Need to create Terraform for ECS cluster/ task definition/ IAM role for ECS/ SQS queue/ Lambda/ IAM role for Lambda 
- Lambda code needs a layer created with API library and whatever library will be used to create the contract object required to write the contract 


