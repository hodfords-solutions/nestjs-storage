import 'dotenv/config';

export const env = {
    AZURE: {
        ACCOUNT_NAME: process.env.AZURE_ACCOUNT_NAME || '',
        ACCOUNT_KEY: process.env.AZURE_ACCOUNT_KEY || '',
        CONTAINER_NAME: process.env.AZURE_CONTAINER_NAME || '',
        SAS_EXPIRED_IN: parseInt(process.env.AZURE_SAS_EXPIRED_IN || '3600'),
        CONTAINER_LEVEL: process.env.AZURE_CONTAINER_LEVEL || 'blob',
        REGION: process.env.AZURE_REGION || process.env.AWS_REGION || 'us-east-1'
    }
};
