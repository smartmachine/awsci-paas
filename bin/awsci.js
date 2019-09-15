#!/usr/bin/env node
const cdk = require('@aws-cdk/core');
const { AwsciStack } = require('../lib/awsci-stack');

const app = new cdk.App();

const props = {
  stackProps: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    }
  },
  baseDomain:      process.env.AWSCI_BASE_DOMAIN,
  apiDomain:       process.env.AWSCI_API_DOMAIN,
  authDomain:      process.env.AWSCI_AUTH_DOMAIN,
  baseCertArn:     process.env.AWSCI_BASE_CERT_ARN,
  wildcardCertArn: process.env.AWSCI_WILDCARD_CERT_ARN,
  callbackUrl:     process.env.AWSCI_CALLBACK_URL,
  logoutUrl:       process.env.AWSCI_LOGOUT_URL
};

console.log("AWSCI Configuration:", props);

new AwsciStack(app, 'AwsciStack', props);
