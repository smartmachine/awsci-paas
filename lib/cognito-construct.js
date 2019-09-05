const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { AuthFlow, UserPool, UserPoolAttribute, UserPoolClient, SignInType } = require('@aws-cdk/aws-cognito');
//const { HostedZone, ARecord, AddressRecordTarget } = require('@aws-cdk/aws-route53');
//const { CloudFrontTarget } = require('@aws-cdk/aws-route53-targets/lib');

//import cloudfront = require('@aws-cdk/aws-cloudfront');

const { UserPoolDomain } = require("./userpool-domain");

/**
 * @typedef {Object}  CognitoPoolOptions
 * @property {string} certificateArn - The certificate ARN to user with the domain
 * @property {string} authDomain     - The custom domain for the cognito pool
 * @property {string} baseDomain     - The base domain for the hosted zone
 * @property {string} callbackUrl    - The callback url for cognito
 * @property {string} logoutUrl      - The logout url for cognito
 */

class CognitoPool extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {CognitoPoolOptions} options
     */
    constructor(scope, id, options) {
        super(scope, id);

        const { certificateArn, authDomain, baseDomain, callbackUrl, logoutUrl } = options;

        const userPool = new UserPool(this, 'userPool', {
            userPoolName:           'awsciPool',
            autoVerifiedAttributes: [UserPoolAttribute.EMAIL],
            signInType:             SignInType.EMAIL,
        });

        new cdk.CfnOutput(this, 'CognitoEndpointURL', { value: userPool.userPoolProviderUrl, description: "The URL of the Cognito Endpoint" });

        const userPoolClient = new UserPoolClient(this, 'userPoolClient', {
            generateSecret:     false,
            enabledAuthFlows:   [AuthFlow.USER_PASSWORD],
            userPool:           userPool,
            userPoolClientName: 'awsciWebClient'
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId, description: 'The ID of the UserPool Client'})

        new UserPoolDomain(this, "userPoolDomain", {
            customResourceOptions: {
                certificateArn:   certificateArn,
                baseDomain:       baseDomain,
                authDomain:       authDomain,
                userPoolId:       userPool.userPoolId,
                userPoolClientId: userPoolClient.userPoolClientId,
                callbackUrl:      callbackUrl,
                logoutUrl:        logoutUrl
            },
            userPoolArn:   userPool.userPoolArn,
            assetCodePath: '../api/cloudformation.zip',
            handler:       'cloudformation'
        });
    }
}

module.exports = { CognitoPool };