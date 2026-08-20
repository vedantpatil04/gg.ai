import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import path from "path";
import { normalizePrivateKey } from "../services/push.service";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function checkFirebaseProject() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  console.log("Project ID:", projectId);
  console.log("Client Email:", clientEmail);
  console.log("Has Private Key:", !!privateKey);

  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/firebase",
    ],
  });

  try {
    const token = await auth.getAccessToken();
    console.log("Successfully authenticated with Google Cloud! Token acquired:", !!token.token);

    // Call Firebase Management API to list Android Apps
    const res = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${projectId}/androidApps`, {
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    });

    console.log("Firebase Android Apps response status:", res.status);
    const data = await res.json();
    console.log("Firebase Android Apps data:", JSON.stringify(data, null, 2));

    if (!data.apps || data.apps.length === 0) {
      console.log("No Android app found. Creating Android app in Firebase project...");
      const createRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${projectId}/androidApps`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageName: "com.vedant.greenguard",
          displayName: "GreenGuard AI",
        }),
      });

      console.log("Create Android App response status:", createRes.status);
      const createData = await createRes.json();
      console.log("Create Android App response:", JSON.stringify(createData, null, 2));

      // Wait a moment for creation operation
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Poll until app appears
    let configFound = null;
    for (let i = 0; i < 10; i++) {
      console.log(`Polling for Android apps (attempt ${i + 1})...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const listRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${projectId}/androidApps`, {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      });
      const updatedData = await listRes.json();
      console.log("Updated Android Apps list:", JSON.stringify(updatedData, null, 2));

      if (updatedData.apps && updatedData.apps.length > 0) {
        for (const app of updatedData.apps) {
          const configRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${projectId}/androidApps/${app.appId}/config`, {
            headers: {
              Authorization: `Bearer ${token.token}`,
            },
          });
          const configData = await configRes.json();
          if (configData.configFileContents) {
            const decoded = Buffer.from(configData.configFileContents, "base64").toString("utf-8");
            console.log(`REAL google-services.json for ${app.appId}:\n`, decoded);
            configFound = decoded;
            break;
          }
        }
        if (configFound) break;
      }
    }
    return configFound;
  } catch (err) {
    console.error("Error inspecting Firebase project:", err);
  }
}

checkFirebaseProject();
