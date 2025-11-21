import { Service } from "encore.dev/service";
import { calendar } from "./calendar";

export default new Service("reservations", {
    calendar: calendar
});
