import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const maxDuration = 300; // 5 minutes

interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  financial_status: string;
  customer?: {
    orders_count?: number;
  };
  line_items: {
    product_id: number | null;
    title: string;
    quantity: number;
    price: string;
    variant_title?: string;
  }[];
  refunds?: {
    created_at: string;
    refund_line_items: {
      subtotal: number;
    }[];
    transactions: {
      amount: string;
    }[];
  }[];
}

async function fetchShopifyOrders(
  shopDomain: string,
  accessToken: string,
  sinceDate: string
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let url =
    `https://${shopDomain}/admin/api/2024-01/orders.json?` +
    `status=any&` +
    `created_at_min=${sinceDate}&` +
    `financial_status=paid,partially_refunded,refunded&` +
    `limit=250`;

  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Shopify API error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    allOrders.push(...(data.orders || []));

    // Handle pagination via Link header
    const linkHeader = res.headers.get("link");
    url = "";
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
  }

  return allOrders;
}

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.shopifyStore.findUnique({
      where: { userId },
    });

    if (!store || store.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "No active Shopify store found" },
        { status: 404 }
      );
    }

    // Calculate date range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceDate = thirtyDaysAgo.toISOString();

    // Fetch all orders from Shopify
    const orders = await fetchShopifyOrders(
      store.shopDomain,
      store.accessToken,
      sinceDate
    );

    // Aggregate into daily buckets
    const dailyBuckets = new Map<
      string,
      {
        totalRevenue: number;
        totalOrders: number;
        newCustomerOrders: number;
        returningCustomerOrders: number;
        newCustomerRevenue: number;
        returningCustomerRevenue: number;
        refundAmount: number;
        refundCount: number;
      }
    >();

    // Product aggregation for top products
    const productAgg = new Map<
      string,
      {
        productId: string;
        productTitle: string;
        variantTitle: string | null;
        totalRevenue: number;
        totalOrders: number;
      }
    >();

    for (const order of orders) {
      const dateKey = order.created_at.split("T")[0];

      if (!dailyBuckets.has(dateKey)) {
        dailyBuckets.set(dateKey, {
          totalRevenue: 0,
          totalOrders: 0,
          newCustomerOrders: 0,
          returningCustomerOrders: 0,
          newCustomerRevenue: 0,
          returningCustomerRevenue: 0,
          refundAmount: 0,
          refundCount: 0,
        });
      }

      const bucket = dailyBuckets.get(dateKey)!;
      const orderTotal = parseFloat(order.total_price) || 0;

      if (
        order.financial_status === "paid" ||
        order.financial_status === "partially_refunded"
      ) {
        bucket.totalRevenue += orderTotal;
        bucket.totalOrders += 1;

        const isNewCustomer =
          order.customer && order.customer.orders_count === 1;
        if (isNewCustomer) {
          bucket.newCustomerOrders += 1;
          bucket.newCustomerRevenue += orderTotal;
        } else {
          bucket.returningCustomerOrders += 1;
          bucket.returningCustomerRevenue += orderTotal;
        }

        // Aggregate line items for top products
        for (const item of order.line_items) {
          if (!item.product_id) continue;
          const productKey = String(item.product_id);

          if (!productAgg.has(productKey)) {
            productAgg.set(productKey, {
              productId: productKey,
              productTitle: item.title,
              variantTitle: item.variant_title || null,
              totalRevenue: 0,
              totalOrders: 0,
            });
          }

          const prod = productAgg.get(productKey)!;
          prod.totalRevenue += item.quantity * parseFloat(item.price);
          prod.totalOrders += 1;
        }
      }

      // Track refunds
      if (order.refunds && order.refunds.length > 0) {
        for (const refund of order.refunds) {
          const refundDate = refund.created_at.split("T")[0];
          if (!dailyBuckets.has(refundDate)) {
            dailyBuckets.set(refundDate, {
              totalRevenue: 0,
              totalOrders: 0,
              newCustomerOrders: 0,
              returningCustomerOrders: 0,
              newCustomerRevenue: 0,
              returningCustomerRevenue: 0,
              refundAmount: 0,
              refundCount: 0,
            });
          }
          const refundBucket = dailyBuckets.get(refundDate)!;
          const refundAmount = refund.transactions.reduce(
            (sum, t) => sum + (parseFloat(t.amount) || 0),
            0
          );
          refundBucket.refundAmount += refundAmount;
          refundBucket.refundCount += 1;
        }
      }
    }

    // Upsert daily metrics
    let metricsUpserted = 0;
    for (const [dateKey, bucket] of dailyBuckets.entries()) {
      const date = new Date(dateKey);
      const aov =
        bucket.totalOrders > 0
          ? bucket.totalRevenue / bucket.totalOrders
          : 0;

      await prisma.shopifyDailyMetric.upsert({
        where: { storeId_date: { storeId: store.id, date } },
        create: {
          userId,
          storeId: store.id,
          date,
          totalRevenue: Math.round(bucket.totalRevenue * 100) / 100,
          totalOrders: bucket.totalOrders,
          averageOrderValue: Math.round(aov * 100) / 100,
          newCustomerOrders: bucket.newCustomerOrders,
          returningCustomerOrders: bucket.returningCustomerOrders,
          newCustomerRevenue:
            Math.round(bucket.newCustomerRevenue * 100) / 100,
          returningCustomerRevenue:
            Math.round(bucket.returningCustomerRevenue * 100) / 100,
          refundAmount: Math.round(bucket.refundAmount * 100) / 100,
          refundCount: bucket.refundCount,
        },
        update: {
          totalRevenue: Math.round(bucket.totalRevenue * 100) / 100,
          totalOrders: bucket.totalOrders,
          averageOrderValue: Math.round(aov * 100) / 100,
          newCustomerOrders: bucket.newCustomerOrders,
          returningCustomerOrders: bucket.returningCustomerOrders,
          newCustomerRevenue:
            Math.round(bucket.newCustomerRevenue * 100) / 100,
          returningCustomerRevenue:
            Math.round(bucket.returningCustomerRevenue * 100) / 100,
          refundAmount: Math.round(bucket.refundAmount * 100) / 100,
          refundCount: bucket.refundCount,
        },
      });
      metricsUpserted++;
    }

    // Upsert top products (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const periodStart = new Date(sevenDaysAgo.toISOString().split("T")[0]);
    const periodEnd = new Date(now.toISOString().split("T")[0]);

    // Delete old top products for this period and store
    await prisma.shopifyTopProduct.deleteMany({
      where: { storeId: store.id },
    });

    // Insert top 10 products by revenue
    const topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    for (const product of topProducts) {
      await prisma.shopifyTopProduct.create({
        data: {
          userId,
          storeId: store.id,
          productId: product.productId,
          productTitle: product.productTitle,
          variantTitle: product.variantTitle,
          totalRevenue: Math.round(product.totalRevenue * 100) / 100,
          totalOrders: product.totalOrders,
          periodStart,
          periodEnd,
        },
      });
    }

    // Update lastSyncAt
    await prisma.shopifyStore.update({
      where: { id: store.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      ordersProcessed: orders.length,
      dailyMetrics: metricsUpserted,
      topProducts: topProducts.length,
    });
  } catch (error) {
    console.error("Shopify sync failed:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
