import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10),
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 60000,
    ssl: {
        rejectUnauthorized: false
    }
});

export default async (req, res) => {

    if (req.method === 'GET') {
        let { medicationCode, type, odsCode, mode,breakdownByODS } = req.query;  // Extract from query parameters

        if (!medicationCode) {
            return res.status(400).json({ error: "Medication code is required." });
        }
        if(mode=="Ingredients"){
          type="number";
        }

        const numberQueryFormulation = `
            SELECT YEAR_MONTH, SUM(TOTAL_QUANITY_IN_VMP_UNIT) AS total_usage, unit_of_measure_name  as unit_name 
            FROM secondary_care_medicines_data INNER JOIN vmp_code_name_mapping ON vmp_code_name_mapping.VMP_SNOMED_CODE = secondary_care_medicines_data.VMP_SNOMED_CODE
            INNER JOIN unit_code_name_mapping 
                ON unit_code_name_mapping.unit_of_measure_identifier = secondary_care_medicines_data.unit_of_measure_identifier 
            WHERE VMP_PRODUCT_NAME = $1 ${odsCode ? `AND ods_code = '${odsCode}'` : ""}
            GROUP BY YEAR_MONTH, secondary_care_medicines_data.unit_of_measure_identifier, unit_code_name_mapping.unit_of_measure_name 
            ORDER BY YEAR_MONTH`;

        const numberQueryIngredient = `
            SELECT 
                YEAR_MONTH, 
                SUM(TOTAL_QUANITY_IN_VMP_UNIT * virtual_product_ingredient.strnt_nmrtr_val * numerator_unit.number_of_basic_unit *
                  COALESCE(vmp_stuff.udfs, 1) ) AS total_usage, 
                numerator_unit.basic_unit as unit_name${breakdownByODS ? ", ods_code" : ""}
            FROM 
                secondary_care_medicines_data 
            INNER JOIN 
                unit_code_name_mapping 
                ON unit_code_name_mapping.unit_of_measure_identifier = secondary_care_medicines_data.unit_of_measure_identifier 
            INNER JOIN
              vmp_stuff
              ON vmp_stuff.vpid = secondary_care_medicines_data.VMP_SNOMED_CODE OR vmp_stuff.vpid_prev = secondary_care_medicines_data.VMP_SNOMED_CODE
            INNER JOIN
              virtual_product_ingredient
              ON virtual_product_ingredient.vpid = vmp_stuff.vpid
            INNER JOIN
                ingredient_data
                ON virtual_product_ingredient.isid = ingredient_data.isid
            INNER JOIN
              unit_data numerator_unit
              ON numerator_unit.uom_cd = virtual_product_ingredient.strnt_nmrtr_uomcd 
            WHERE 
                virtual_product_ingredient.isid  = $1 
                ${odsCode ? `AND ods_code = '${odsCode}'` : ""}
            GROUP BY 
                YEAR_MONTH, numerator_unit.basic_unit ${breakdownByODS ? ", ods_code" : ""}
            ORDER BY 
                YEAR_MONTH`;

        const priceQuery = `
            SELECT YEAR_MONTH, SUM(indicative_cost) AS total_cost, unit_of_measure_name  as unit_name 
            FROM secondary_care_medicines_data 
            INNER JOIN unit_code_name_mapping  
                ON unit_code_name_mapping.unit_of_measure_identifier = secondary_care_medicines_data.unit_of_measure_identifier 
                INNER JOIN vmp_code_name_mapping ON vmp_code_name_mapping.VMP_SNOMED_CODE = secondary_care_medicines_data.VMP_SNOMED_CODE
            WHERE VMP_PRODUCT_NAME = $1 ${odsCode ? `AND ods_code = '${odsCode}'` : ""}
            GROUP BY YEAR_MONTH, secondary_care_medicines_data.unit_of_measure_identifier, unit_code_name_mapping.unit_of_measure_name 
            ORDER BY YEAR_MONTH`;

        const result = await pool.query(type == "number" ? (
            mode == "Formulations" ? numberQueryFormulation : numberQueryIngredient
        ) : priceQuery, [medicationCode]);

        res.json(result.rows);
    }
};
