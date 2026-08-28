import { MimeTypeEnum } from '../enums/mime-type.enum.js';
import { ImageFormatEnum } from '../enums/image-format.enum.js';

export type OptionUploadFileType = {
    imageFormat: ImageFormatEnum;
    mimeTypeConverts: MimeTypeEnum[];
};
