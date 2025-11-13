import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { S3RequestPresigner } from "@aws-sdk/s3-request-presigner";
import { parseUrl } from "@aws-sdk/url-parser";
import { Hash } from "@aws-sdk/hash-node";
import { formatUrl } from "@aws-sdk/util-format-url";
import FormData from "form-data";
import axios from 'axios';

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function downloadCatalogFromS3(): Promise<FormData> {
    const response = await axios.get('https://aline-furo-humanizado.s3.us-east-1.amazonaws.com/documentos/Aline+Furo+Humanizado+.pdf', { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);
    const fileName = "catalogo.pdf";

    const formData = new FormData();

    formData.append('attachments[]', fileBuffer, { filename: fileName });
    formData.append('content', 'Aqui está seu PDF.');
    formData.append('message_type', 'outgoing');
    formData.append('private', 'false');

    return formData;
}

export async function downloadEarMapFromS3(): Promise<FormData> {
    const response = await axios.get('https://aline-furo-humanizado.s3.us-east-1.amazonaws.com/documentos/furos.jpeg', { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);
    const fileName = "mapa_de_furos.jpeg";

    const formData = new FormData();

    formData.append('attachments[]', fileBuffer, { filename: fileName });
    formData.append('content', 'Aqui está o mapa de furos.');
    formData.append('message_type', 'outgoing');
    formData.append('private', 'false');

    return formData;
}

export async function uploadImageToS3(base64Data: string, fileName: string): Promise<string> {
    const bucketName = process.env.AWS_BUCKET_NAME!;
    const fileKey = `${uuidv4()}-${fileName}`;

    const base64Body = base64Data.split(";base64,").pop()!;
    const buffer = Buffer.from(base64Body, "base64");

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: buffer,
        ContentType: getMimeTypeFromBase64(base64Data),
    });

    await s3.send(command);

    const s3ObjectUrl = parseUrl(`https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`);
    const presigner = new S3RequestPresigner({
        region: process.env.AWS_REGION!,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        sha256: Hash.bind(null, "sha256"), // In Node.js
    });

    // Create a GET request from S3 url.
    const url = await presigner.presign(new HttpRequest(s3ObjectUrl));

    return formatUrl(url);
    // return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
}

function getMimeTypeFromBase64(base64: string): string {
    const matches = base64.match(/^data:(.+);base64,/);
    return matches ? matches[1] : "application/octet-stream";
}
