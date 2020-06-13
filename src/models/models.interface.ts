import { Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  password: string;
  accessToken: string;
  accessTokenExpirationTimestamp: number;
  lastSonosAuthorizationDateString: string;
  refreshToken: string;
  devices: IDevice[];
  rfidChips: IRfidChip[];
  rfidIsRegistering: boolean;
  comparePassword: Function;
}

export interface IDevice extends Document {
  deviceId: string;
  lastPong: Date;
  user: IUser;
  deviceName: string;
  sonosGroupId: string;
  sonosHouseholdId: string;
}

export interface IRfidChip extends Document {
  user: IUser;
  id: string;
  sonosPlaylistId: string;
  sonosHouseholdId: string;
}
