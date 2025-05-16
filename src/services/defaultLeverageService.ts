import { supabase } from "@/lib/supabase";

export const setDefaultLeverage = async (userId: string, defaultLeverage: number) => {
    const { error } = await supabase.rpc("set_default_leverage", {
        p_user_id: userId,
        p_default_leverage: defaultLeverage,
    });

    if (error) {
        throw new Error(`Failed to set default leverage: ${error.message}`);
    }
};

export const getDefaultLeverage = async (userId: string): Promise<number> => {
    const { data, error } = await supabase.rpc("get_default_leverage", {
        p_user_id: userId,
    });

    if (error) {
        throw new Error(`Failed to get default leverage: ${error.message}`);
    }

    return data || 1; // Default to 1 if no leverage is set
};
