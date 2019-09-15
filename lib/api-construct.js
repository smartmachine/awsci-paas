const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { RestApi } = require('@aws-cdk/aws-apigateway');
const { EndpointType } = require('@aws-cdk/aws-apigateway/lib/restapi');
const { Certificate } = require('@aws-cdk/aws-certificatemanager');
const { HostedZone, ARecord, AddressRecordTarget } = require('@aws-cdk/aws-route53');
const { ApiGateway } = require('@aws-cdk/aws-route53-targets/lib');

const { GithubLogin } = require('./github-login');
const { CognitoInfo } = require('./cognito-info');

/**
 * @typedef {Object} LambdaApiOptions
 * @property {string} wildcardCertArn - The domain name where this app will be installed.
 * @property {string} apiDomain       - The domain where the api services will be hosted
 * @property {string} baseDomain      - The base domain for the zone in question
 */

class LambdaApi extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {LambdaApiOptions} options
     */
    constructor(scope, id, options) {
        super(scope, id);

        const {
            wildcardCertArn,
            apiDomain,
            baseDomain
        } = options;

        const wildcard    = Certificate.fromCertificateArn(this, 'Wildcard', wildcardCertArn);

        const api = new RestApi(this, "awsci-api", {
            domainName: {
                domainName: apiDomain,
                endpointType: EndpointType.EDGE,
                certificate: wildcard
            },
        });

        const github = api.root.addResource('github');

        new GithubLogin(this, "githubLogin", {
            api: api,
            resource: github
        });

        const cognito = api.root.addResource('cognito');

        const cognitoInfo = new CognitoInfo(this, 'cognitoInfo', {
            api: api,
            resource: cognito
        });


        this._cognitoInfoLambda = cognitoInfo.lambda;

        const zone = HostedZone.fromLookup(this, "zone", {
            domainName: baseDomain,
        });

        new ARecord(this, 'APIAliasRecord', {
            recordName: apiDomain,
            target: AddressRecordTarget.fromAlias(new ApiGateway(api)),
            zone: zone
        });

        new cdk.CfnOutput(this, 'ApiEndpointURL', { value: "https://" + apiDomain, description: "The URL of the API Endpoint" })
    }

    get cognitoInfoLambda() {
        return this._cognitoInfoLambda;
    }

}

module.exports = { LambdaApi };