'use strict';


exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('address', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('organization').notNullable(); // Snapshot of account's organization
      t.string('phone'); // Snapshot of account's phone
      t.string('street').notNullable();
      t.string('street_2');
      t.string('city').notNullable();
      t.string('state').notNullable();
      t.string('zipcode').notNullable();
      t.string('country', 2).notNullable(); // Use country ISO2
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
    }),

    knex.schema.createTable('account', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('organization').notNullable();
      t.string('phone');
      t.string('stripe_id');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.uuid('address_id')
        .references('id').inTable('address')
        .onUpdate('cascade').onDelete('SET NULL');
    }),

    knex.schema.createTable('user', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('email').notNullable().index().unique();
      t.string('fname');
      t.string('lname');
      t.string('password_hash');
      t.string('password_reset_token');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.dateTime('password_reset_at');
      t.uuid('account_id').notNullable().index()
        .references('id').inTable('account')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('comment', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.text('message').notNullable();
      t.uuid('commentable_id').notNullable().index();
      t.string('commentable_type').notNullable().index();
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.uuid('user_id').notNullable().index()
        .references('id').inTable('user')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('request', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.integer('state').notNullable().index().defaultTo(0);
      t.string('subject');
      t.text('body');
      t.dateTime('deleted_at');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.uuid('account_id').notNullable()
        .references('id').inTable('account')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('property', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('name').notNullable();
      t.string('url').notNullable();
      t.string('credential_key');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.uuid('account_id').notNullable().index()
        .references('id').inTable('account')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('property_request', function (t) {
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.uuid('property_id').notNullable()
        .references('id').inTable('property')
        .onUpdate('cascade').onDelete('cascade');
      t.uuid('request_id').notNullable()
        .references('id').inTable('request')
        .onUpdate('cascade').onDelete('cascade');
      t.primary(['property_id', 'request_id']);
    }),

    knex.schema.createTable('product', function (t) {
      t.increments();
      t.string('name').notNullable();
      t.text('description');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
    }),

    knex.schema.createTable('sku', function (t) {
      t.increments();
      t.string('sku').unique().notNullable().index();
      t.string('name').notNullable();
      t.text('description');
      t.integer('price').notNullable();
      t.string('currency').notNullable().defaultTo('usd');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.integer('product_id').index()
        .references('id').inTable('product')
        .onUpdate('cascade').onDelete('cascade');
    }),

    knex.schema.createTable('line_item', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('lineable_id').notNullable().index();
      t.text('lineable_type').notNullable().index(); // order, invoice, plan
      t.integer('amount').notNullable();
      t.string('currency').notNullable();
      t.float('quantity').unsigned().notNullable().defaultTo(0);
      t.text('description');
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.integer('sku_id')
        .references('id').inTable('sku')
        .onUpdate('cascade').onDelete('SET NULL');
    }),

    knex.schema.createTable('order', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.integer('state').notNullable().index().defaultTo(0);
      t.text('note');

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.uuid('account_id').notNullable().index()
        .references('id').inTable('account')
        .onUpdate('cascade');
      t.uuid('request_id').index()
        .references('id').inTable('request')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('invoice', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.boolean('paid').notNullable().defaultTo(false);
      t.boolean('closed').notNullable().defaultTo(false);
      t.boolean('attempted').notNullable().defaultTo(false);
      t.integer('attempt_count').unsigned().defaultTo(0);
      t.text('note');

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
      t.uuid('account_id').notNullable().index()
        .references('id').inTable('account')
        .onUpdate('cascade');
      t.uuid('address_id').notNullable()
        .references('id').inTable('address')
        .onUpdate('cascade');
      t.uuid('subscription_id')
        .references('id').inTable('subscription')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('invoice_order', function (t) {
      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.uuid('invoice_id').notNullable()
        .references('id').inTable('invoice')
        .onUpdate('cascade');
      t.uuid('order_id').notNullable()
        .references('id').inTable('order')
        .onUpdate('cascade');
      t.primary(['invoice_id', 'order_id']);
    }),

    knex.schema.createTable('payment', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('method').notNullable(); // block, charge, check, ACH, bank
      t.integer('amount').notNullable();
      t.string('currency').notNullable();
      t.string('charge_id'); // Stripe ID, check number, PayPal transaction ID
      t.string('charge_gateway');
      t.text('note');

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.uuid('invoice_id').notNullable().index()
        .references('id').inTable('invoice')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('refund', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('method').notNullable(); // block, charge, check, ACH, bank
      t.integer('amount').notNullable();
      t.string('currency').notNullable();
      t.string('refund_id'); // Stripe ID, check number, PayPal transaction ID
      t.string('refund_gateway');
      t.string('reason');

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.uuid('payment_id').notNullable()
        .references('id').inTable('payment')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('plan', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('name').notNullable();
      t.integer('interval').notNullable(); // 0 = day, 1 = week, 2 = month, 3 = year
      t.integer('interval_count').notNullable();

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('deleted_at');
    }),

    knex.schema.createTable('subscription', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.integer('state').notNullable(); // _, active, past due, canceled, unpaid
      t.dateTime('current_period_start').notNullable();
      t.dateTime('current_period_end').notNullable();
      t.dateTime('canceled_at');
      t.dateTime('ended_at');

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));
      t.dateTime('updated_at').notNullable().defaultTo(knex.raw('NOW()'));

      t.uuid('account_id').notNullable()
        .references('id').inTable('account')
        .onUpdate('cascade');
      t.uuid('plan_id').notNullable()
        .references('id').inTable('plan')
        .onUpdate('cascade');
    }),

    knex.schema.createTable('card', function (t) {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('stripe_id').notNullable();
      t.string('brand').notNullable();
      t.string('last4').notNullable();
      t.integer('expiration_month').notNullable();
      t.integer('expiration_year').notNullable();

      t.dateTime('created_at').notNullable().defaultTo(knex.raw('NOW()'));

      t.uuid('account_id').notNullable()
        .references('id').inTable('account')
        .onUpdate('cascade');
    }),
  ])
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.schema.dropTableIfExists('refund'),
    knex.schema.dropTableIfExists('payment'),
    knex.schema.dropTableIfExists('invoice_order'),
    knex.schema.dropTableIfExists('invoice'),
    knex.schema.dropTableIfExists('subscription'),
    knex.schema.dropTableIfExists('plan'),
    knex.schema.dropTableIfExists('card'),
    knex.schema.dropTableIfExists('order'),
    knex.schema.dropTableIfExists('line_item'),
    knex.schema.dropTableIfExists('sku'),
    knex.schema.dropTableIfExists('product'),
    knex.schema.dropTableIfExists('property_request'),
    knex.schema.dropTableIfExists('property'),
    knex.schema.dropTableIfExists('request'),
    knex.schema.dropTableIfExists('comment'),
    knex.schema.dropTableIfExists('user'),
    knex.schema.dropTableIfExists('account'),
    knex.schema.dropTableIfExists('address'),
  ]);
};
