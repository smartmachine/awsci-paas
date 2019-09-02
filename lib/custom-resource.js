const cdk = require('@aws-cdk/core');
const { Stack } = require('@aws-cdk/core');
const cfn = require('@aws-cdk/aws-cloudformation');
const lambda = require('@aws-cdk/aws-lambda');

const fs = require('fs');

class CustomResourceStack extends Stack {

    /**
     * @property {string} response - The response of the resource
     */

    /**
     * @param {cdk.App} scope
     * @param {string} id
     * @param {Object=} props
     */
    constructor(scope, id, props) {
        super(scope, id, props);

        const resource = new cfn.CustomResource(this, "customResource", {
            provider: cfn.CustomResourceProvider.lambda(new lambda.SingletonFunction(this, 'Singleton', {
                uuid: '4adc734e-2514-4d27-97c5-af2167df061c',
                code: new lambda.InlineCode(fs.readFileSync('lib/custom-resource-handler.py', { encoding: 'utf-8'})),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(300),
                runtime: lambda.Runtime.PYTHON_2_7
            })),
            properties: props
        });

        this._response = resource.getAtt('Response').toString();

    }

    get response() {
        return this._response;
    }
}

module.exports = { CustomResourceStack };
